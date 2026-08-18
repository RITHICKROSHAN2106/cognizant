import os
import json
import logging
import time
import datetime
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

logger = logging.getLogger("medinsight.mongodb")

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, DuplicateKeyError
    from bson import ObjectId
except ImportError:
    MongoClient = None
    ASCENDING = 1
    DESCENDING = -1
    ConnectionFailure = Exception
    ServerSelectionTimeoutError = Exception
    DuplicateKeyError = Exception
    ObjectId = str


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Converts MongoDB BSON types (like ObjectId) to clean JSON serializable fields."""
    if doc is None:
        return None
    res = dict(doc)
    if "_id" in res:
        res["_id"] = str(res["_id"])
    return res


def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_doc(d) for d in docs]


class MemoryCursor:
    """Cursor wrapper for in-memory collections supporting sort, skip, limit."""

    def __init__(self, data: List[Dict[str, Any]]):
        self._data = list(data)

    def sort(self, key_or_list: Any, direction: int = 1):
        if isinstance(key_or_list, str):
            reverse = (direction == -1 or direction == DESCENDING)
            self._data.sort(key=lambda x: (x.get(key_or_list) is None, x.get(key_or_list, 0) or 0), reverse=reverse)
        elif isinstance(key_or_list, list) and key_or_list:
            key, d = key_or_list[0]
            reverse = (d == -1 or d == DESCENDING)
            self._data.sort(key=lambda x: (x.get(key) is None, x.get(key, 0) or 0), reverse=reverse)
        return self

    def skip(self, n: int):
        self._data = self._data[n:]
        return self

    def limit(self, n: int):
        self._data = self._data[:n]
        return self

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

    def __getitem__(self, idx):
        return self._data[idx]


class MemoryDocumentCollection:
    """Fast indexed collection with instantaneous incremental disk persistence."""

    def __init__(self, name: str, storage_dir: Optional[str] = None):
        self.name = name
        self.storage_dir = storage_dir
        self.base_path = os.path.join(storage_dir, f"{name}.json") if storage_dir else None
        self.custom_path = os.path.join(storage_dir, f"{name}_custom.json") if storage_dir else None
        self._data: List[Dict[str, Any]] = []
        self._custom_data: List[Dict[str, Any]] = []
        self._indexed_fields = ["_id", "id", "source_patient_id", "source_encounter_id", "patient_id", "mrn", "username", "encounter_id", "patient_nbr"]
        self._indexes: Dict[str, Dict[Any, List[Dict[str, Any]]]] = {k: {} for k in self._indexed_fields}
        self._unique_indexes: Dict[str, Dict[Any, Dict[str, Any]]] = {k: {} for k in self._indexed_fields}
        self._load_from_storage()

    def _load_from_storage(self):
        # 1. Load base dataset
        if self.base_path and os.path.exists(self.base_path):
            try:
                with open(self.base_path, "r", encoding="utf-8") as f:
                    docs = json.load(f)
                    if isinstance(docs, list):
                        self._data = docs
            except Exception as e:
                logger.error(f"Error loading base '{self.name}': {e}")

        # 2. Load custom / registered records
        if self.custom_path and os.path.exists(self.custom_path):
            try:
                with open(self.custom_path, "r", encoding="utf-8") as f:
                    custom_docs = json.load(f)
                    if isinstance(custom_docs, list):
                        self._custom_data = custom_docs
                        self._data.extend(custom_docs)
            except Exception as e:
                logger.error(f"Error loading custom '{self.name}': {e}")

        self._rebuild_indexes()
        if self._data:
            logger.info(f"Loaded {len(self._data):,} records for collection '{self.name}'.")

    def _save_custom_storage(self):
        if self.custom_path:
            try:
                os.makedirs(os.path.dirname(self.custom_path), exist_ok=True)
                with open(self.custom_path, "w", encoding="utf-8") as f:
                    json.dump(self._custom_data, f)
            except Exception as e:
                logger.error(f"Error saving custom '{self.name}': {e}")

    def _rebuild_indexes(self):
        self._indexes = {k: {} for k in self._indexed_fields}
        self._unique_indexes = {k: {} for k in self._indexed_fields}
        for doc in self._data:
            self._index_doc(doc)

    def _index_doc(self, doc: Dict[str, Any]):
        for f in self._indexed_fields:
            if f in doc:
                val = doc[f]
                if f not in self._indexes:
                    self._indexes[f] = {}
                if f not in self._unique_indexes:
                    self._unique_indexes[f] = {}
                if val not in self._indexes[f]:
                    self._indexes[f][val] = []
                self._indexes[f][val].append(doc)
                if val not in self._unique_indexes[f]:
                    self._unique_indexes[f][val] = doc

    def create_index(self, keys, unique=False, **kwargs):
        return f"idx_{self.name}"

    def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        if "id" not in doc_copy and "_id" not in doc_copy:
            doc_copy["id"] = len(self._data) + 1
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(doc_copy.get("id", len(self._data) + 1))
        
        self._data.append(doc_copy)
        self._custom_data.append(doc_copy)
        self._index_doc(doc_copy)
        self._save_custom_storage()
        return type("InsertOneResult", (), {"inserted_id": doc_copy.get("_id")})()

    def insert_many(self, docs: List[Dict[str, Any]]):
        inserted_ids = []
        is_large_batch = len(docs) > 1000

        for d in docs:
            doc_copy = dict(d)
            if "id" not in doc_copy and "_id" not in doc_copy:
                doc_copy["id"] = len(self._data) + 1
            if "_id" not in doc_copy:
                doc_copy["_id"] = str(doc_copy.get("id", len(self._data) + 1))
            self._data.append(doc_copy)
            self._index_doc(doc_copy)
            inserted_ids.append(doc_copy.get("_id"))
            if not is_large_batch:
                self._custom_data.append(doc_copy)

        if is_large_batch:
            if self.base_path:
                try:
                    os.makedirs(os.path.dirname(self.base_path), exist_ok=True)
                    with open(self.base_path, "w", encoding="utf-8") as f:
                        json.dump(self._data, f)
                except Exception as e:
                    logger.error(f"Error saving base '{self.name}': {e}")
        else:
            self._save_custom_storage()

        return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    def find_one(self, filter_query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not filter_query:
            if self._data:
                res = dict(self._data[0])
                if projection and projection.get("_id") == 0:
                    res.pop("_id", None)
                return res
            return None

        # Fast single indexed field lookup (< 1ms)
        if len(filter_query) == 1:
            key, val = next(iter(filter_query.items()))
            if not isinstance(val, (dict, list)) and key in self._unique_indexes:
                cand = self._unique_indexes[key].get(val)
                if cand is None and isinstance(val, int):
                    cand = self._unique_indexes[key].get(str(val))
                elif cand is None and isinstance(val, str) and val.isdigit():
                    cand = self._unique_indexes[key].get(int(val))
                if cand:
                    res = dict(cand)
                    if projection and projection.get("_id") == 0:
                        res.pop("_id", None)
                    return res

        cursor = self.find(filter_query, projection)
        results = list(cursor)
        return results[0] if results else None

    def find(self, filter_query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> MemoryCursor:
        filter_query = filter_query or {}
        
        candidates = self._data
        if len(filter_query) == 1:
            key, val = next(iter(filter_query.items()))
            if not isinstance(val, (dict, list)) and key in self._indexes:
                matches_list = self._indexes[key].get(val, [])
                if not matches_list and isinstance(val, int):
                    matches_list = self._indexes[key].get(str(val), [])
                elif not matches_list and isinstance(val, str) and val.isdigit():
                    matches_list = self._indexes[key].get(int(val), [])
                candidates = matches_list

        matches = []
        for doc in candidates:
            match = True
            for k, v in filter_query.items():
                if k == "$or" and isinstance(v, list):
                    or_matched = False
                    for cond in v:
                        cond_match = True
                        for ck, cv in cond.items():
                            if isinstance(cv, dict) and "$regex" in cv:
                                if cv["$regex"].lower() not in str(doc.get(ck, "")).lower():
                                    cond_match = False
                                    break
                            elif doc.get(ck) != cv:
                                cond_match = False
                                break
                        if cond_match:
                            or_matched = True
                            break
                    if not or_matched:
                        match = False
                        break
                elif isinstance(v, dict):
                    if "$in" in v and doc.get(k) not in v["$in"]:
                        match = False
                        break
                    if "$regex" in v and not (v["$regex"].lower() in str(doc.get(k, "")).lower()):
                        match = False
                        break
                    if "$gte" in v and (doc.get(k) is None or doc.get(k, 0) < v["$gte"]):
                        match = False
                        break
                    if "$lte" in v and (doc.get(k) is None or doc.get(k, 0) > v["$lte"]):
                        match = False
                        break
                    if "$ne" in v and doc.get(k) == v["$ne"]:
                        match = False
                        break
                elif doc.get(k) != v:
                    if str(doc.get(k)) != str(v):
                        match = False
                        break
            if match:
                res = dict(doc)
                if projection and projection.get("_id") == 0:
                    res.pop("_id", None)
                matches.append(res)
        return MemoryCursor(matches)

    def update_one(self, filter_query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        doc = self.find_one(filter_query)
        if doc:
            for original in self._data:
                if all(str(original.get(k)) == str(filter_query[k]) for k in filter_query):
                    if "$set" in update:
                        original.update(update["$set"])
                    self._rebuild_indexes()
                    self._save_custom_storage()
                    return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1, "upserted_id": None})()
        elif upsert:
            new_doc = dict(filter_query)
            if "$set" in update:
                new_doc.update(update["$set"])
            self.insert_one(new_doc)
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0, "upserted_id": new_doc.get("id")})()
        return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0, "upserted_id": None})()

    def delete_one(self, filter_query: Dict[str, Any]):
        for i, doc in enumerate(self._data):
            match = all(str(doc.get(k)) == str(v) for k, v in filter_query.items())
            if match:
                removed = self._data.pop(i)
                if removed in self._custom_data:
                    self._custom_data.remove(removed)
                self._rebuild_indexes()
                self._save_custom_storage()
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        if not filter_query:
            return len(self._data)
        return len(list(self.find(filter_query)))

    def delete_many(self, filter_query: Optional[Dict[str, Any]] = None):
        filter_query = filter_query or {}
        initial_len = len(self._data)
        self._data = [d for d in self._data if not all(str(d.get(k)) == str(v) for k, v in filter_query.items())]
        self._custom_data = [d for d in self._custom_data if not all(str(d.get(k)) == str(v) for k, v in filter_query.items())]
        self._rebuild_indexes()
        self._save_custom_storage()
        return type("DeleteResult", (), {"deleted_count": initial_len - len(self._data)})()


class MemoryDocumentDatabase:
    """Document Database providing collections with fast persistent backing."""

    def __init__(self, name: str):
        self.name = name
        self.storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage"))
        os.makedirs(self.storage_dir, exist_ok=True)
        self._collections: Dict[str, MemoryDocumentCollection] = {}

    def __getitem__(self, name: str) -> MemoryDocumentCollection:
        if name not in self._collections:
            self._collections[name] = MemoryDocumentCollection(name, storage_dir=self.storage_dir)
        return self._collections[name]

    def list_collection_names(self) -> List[str]:
        cols = set(self._collections.keys())
        if os.path.exists(self.storage_dir):
            for fname in os.listdir(self.storage_dir):
                if fname.endswith(".json") and not fname.endswith("_custom.json"):
                    cols.add(fname[:-5])
        return list(cols)

    def command(self, cmd: str) -> Dict[str, Any]:
        return {"ok": 1}


class MongoDBManager:
    """
    Singleton connection manager for MongoDB.
    Maintains persistent connection pool, automatic indexing, and graceful shutdown.
    """
    _instance = None
    client: Optional[MongoClient] = None
    db: Any = None
    is_atlas: bool = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.connect()

    def connect(self):
        mongo_uri = settings.mongo_connection_uri
        db_name = settings.mongo_db_name

        # Safe host-only log (never log full URI with credentials)
        try:
            from urllib.parse import urlparse
            parsed = urlparse(mongo_uri)
            safe_host = parsed.hostname or "unknown"
        except Exception:
            safe_host = "configured"

        logger.info(f"Connecting to MongoDB | host={safe_host} | database={db_name}")

        if mongo_uri and MongoClient:
            try:
                # Support both localhost (mongodb://) and Atlas (mongodb+srv://) URIs
                connect_kwargs = dict(
                    serverSelectionTimeoutMS=8000,
                    connectTimeoutMS=8000,
                    socketTimeoutMS=15000,
                    maxPoolSize=50,
                    minPoolSize=5,
                )
                # Atlas SRV connections need TLS; pymongo handles this automatically
                # but we must NOT override tlsAllowInvalidCertificates for production
                self.client = MongoClient(mongo_uri, **connect_kwargs)
                # Perform real ping to confirm connectivity before accepting
                self.client.admin.command("ping")
                self.db = self.client[db_name]
                self.is_atlas = "mongodb+srv" in mongo_uri
                conn_type = "MongoDB Atlas" if self.is_atlas else "MongoDB Local"
                logger.info(f"✅ Connected to {conn_type} | database={db_name}")
                self.ensure_indexes()
                return
            except Exception as e:
                logger.warning(
                    f"⚠️  MongoDB connection failed ({type(e).__name__}: {e}). "
                    f"Falling back to High-Performance Document Store."
                )

        # Fallback to persistent high-performance document store (local JSON files)
        self.db = MemoryDocumentDatabase(db_name)
        self.is_atlas = False
        logger.warning(
            f"🟡 Using local High-Performance Document Store ('{db_name}'). "
            f"Data is NOT persisted to MongoDB Atlas — check MONGODB_URI in .env"
        )
        self.ensure_indexes()

    def ensure_indexes(self):
        """Creates mandatory institutional indexes across core collections."""
        try:
            db = self.db
            db["patients"].create_index([("mrn", ASCENDING)], unique=True)
            db["patients"].create_index([("source_patient_id", ASCENDING)])
            db["patients"].create_index([("patient_nbr", ASCENDING)])
            db["patients"].create_index([("risk_probability", DESCENDING)])
            
            db["encounters"].create_index([("encounter_id", ASCENDING)], unique=True)
            db["encounters"].create_index([("patient_id", ASCENDING)])
            db["encounters"].create_index([("source_encounter_id", ASCENDING)])
            
            db["users"].create_index([("username", ASCENDING)], unique=True)
            db["observations"].create_index([("patient_id", ASCENDING), ("encounter_id", ASCENDING)])
            db["audit_logs"].create_index([("timestamp", DESCENDING)])
            db["post_discharge_care_plans"].create_index([("patient_id", ASCENDING)], unique=True)
        except Exception as ex:
            logger.warning(f"Index creation notice: {ex}")

    def close(self):
        if self.client:
            try:
                self.client.close()
                logger.info("MongoDB client connection pool safely closed.")
            except Exception as e:
                logger.error(f"Error closing MongoDB client: {e}")

    def get_db(self):
        if self.db is None:
            self.connect()
        return self.db


mongodb_manager = MongoDBManager.get_instance()


def get_mongodb():
    return mongodb_manager.get_db()


def get_db():
    return mongodb_manager.get_db()
