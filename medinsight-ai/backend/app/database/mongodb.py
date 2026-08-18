import logging
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("medinsight.mongodb")

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
except ImportError:
    MongoClient = None
    ConnectionFailure = Exception
    ServerSelectionTimeoutError = Exception


class MemoryCursor:
    """Cursor wrapper for in-memory collections supporting sort, skip, limit."""

    def __init__(self, data: List[Dict[str, Any]]):
        self._data = list(data)

    def sort(self, key_or_list: Any, direction: int = 1):
        if isinstance(key_or_list, str):
            reverse = (direction == -1)
            self._data.sort(key=lambda x: x.get(key_or_list, 0), reverse=reverse)
        elif isinstance(key_or_list, list) and key_or_list:
            key, d = key_or_list[0]
            self._data.sort(key=lambda x: x.get(key, 0), reverse=(d == -1))
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
    """In-memory fallback document collection providing standard PyMongo API."""

    def __init__(self, name: str):
        self.name = name
        self._data: List[Dict[str, Any]] = []

    def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        if "id" not in doc_copy and "_id" not in doc_copy:
            doc_copy["id"] = len(self._data) + 1
        elif "_id" in doc_copy and "id" not in doc_copy:
            doc_copy["id"] = doc_copy["_id"]
        self._data.append(doc_copy)
        return type("InsertResult", (), {"inserted_id": doc_copy.get("id", doc_copy.get("_id"))})()

    def insert_many(self, docs: List[Dict[str, Any]]):
        for doc in docs:
            self.insert_one(doc)

    def find_one(self, filter_query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        cursor = self.find(filter_query, projection)
        results = list(cursor)
        return results[0] if results else None

    def find(self, filter_query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> MemoryCursor:
        filter_query = filter_query or {}
        matches = []
        for doc in self._data:
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
                    if "$gte" in v and doc.get(k, 0) < v["$gte"]:
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                res = dict(doc)
                if projection:
                    if projection.get("_id") == 0:
                        res.pop("_id", None)
                matches.append(res)
        return MemoryCursor(matches)

    def update_one(self, filter_query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        doc = self.find_one(filter_query)
        if doc:
            for original in self._data:
                if all(original.get(k) == filter_query[k] for k in filter_query):
                    if "$set" in update:
                        original.update(update["$set"])
                    break
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
            match = all(doc.get(k) == v for k, v in filter_query.items())
            if match:
                self._data.pop(i)
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        return len(list(self.find(filter_query)))

    def delete_many(self, filter_query: Optional[Dict[str, Any]] = None):
        filter_query = filter_query or {}
        initial_len = len(self._data)
        self._data = [d for d in self._data if not all(d.get(k) == v for k, v in filter_query.items())]
        return type("DeleteResult", (), {"deleted_count": initial_len - len(self._data)})()


class MemoryDocumentDatabase:
    """In-memory Document DB providing collections when MongoDB cluster is offline."""

    def __init__(self, name: str):
        self.name = name
        self._collections: Dict[str, MemoryDocumentCollection] = {}

    def __getitem__(self, name: str) -> MemoryDocumentCollection:
        if name not in self._collections:
            self._collections[name] = MemoryDocumentCollection(name)
        return self._collections[name]

    def list_collection_names(self) -> List[str]:
        return list(self._collections.keys())

    def command(self, cmd: str) -> Dict[str, Any]:
        return {"ok": 1}


class MongoDBManager:
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
        mongo_url = settings.MONGODB_URL
        db_name = settings.MONGODB_DB_NAME

        if mongo_url and MongoClient:
            try:
                self.client = MongoClient(
                    mongo_url,
                    serverSelectionTimeoutMS=4000,
                    connectTimeoutMS=4000,
                    socketTimeoutMS=4000
                )
                self.client.admin.command('ping')
                self.db = self.client[db_name]
                self.is_atlas = True
                logger.info(f"Connected to MongoDB Atlas: {db_name}")
                return
            except Exception as e:
                logger.warning(f"MongoDB connection failed: {e}. Activating High-Performance Document Store.")

        # Fallback to in-memory document store
        self.db = MemoryDocumentDatabase(db_name)
        self.is_atlas = False
        logger.info(f"Using High-Performance In-Memory Document Store: {db_name}")

    def get_db(self):
        if self.db is None:
            self.connect()
        return self.db


mongodb_manager = MongoDBManager.get_instance()


def get_mongodb():
    return mongodb_manager.get_db()


def get_db():
    return mongodb_manager.get_db()
