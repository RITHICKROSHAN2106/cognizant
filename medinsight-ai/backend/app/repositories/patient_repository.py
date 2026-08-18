import logging
import datetime
from typing import Dict, Any, List, Optional
from app.database.mongodb import get_mongodb, serialize_doc, serialize_docs

logger = logging.getLogger("medinsight.patient_repo")


class PatientRepository:
    def __init__(self, db=None):
        self._db = db

    @property
    def col(self):
        return (self._db if self._db is not None else get_mongodb())["patients"]

    def get_by_id(self, patient_id: int) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"id": patient_id})
        if not doc:
            doc = self.col.find_one({"source_patient_id": patient_id})
        return serialize_doc(doc)

    def get_by_mrn(self, mrn: str) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"mrn": mrn.strip()})
        return serialize_doc(doc)

    def create(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.col.insert_one(patient_data)
        inserted_id = getattr(res, "inserted_id", None)
        # Verify persistence immediately
        saved = self.col.find_one({"id": patient_data["id"]})
        if not saved:
            raise RuntimeError("Failed to verify patient document persistence in MongoDB.")
        return serialize_doc(saved)

    def update(self, patient_id: int, update_fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.col.update_one({"id": patient_id}, {"$set": update_fields})
        updated = self.col.find_one({"id": patient_id})
        return serialize_doc(updated)

    def list_patients(
        self,
        skip: int = 0,
        limit: int = 30,
        sort_by: str = "risk_probability",
        sort_desc: bool = True,
        record_source: Optional[str] = None,
        risk_level: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if record_source:
            query["record_source"] = record_source
        if risk_level:
            query["risk_level"] = risk_level

        direction = -1 if sort_desc else 1
        cursor = self.col.find(query).sort(sort_by, direction).skip(skip).limit(limit)
        return serialize_docs(list(cursor))

    def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        return self.col.count_documents(query or {})

    def search(self, search_term: str, limit: int = 25) -> List[Dict[str, Any]]:
        term = search_term.strip()
        if not term:
            return self.list_patients(limit=limit)

        or_conditions = [
            {"mrn": {"$regex": term}},
            {"first_name": {"$regex": term}},
            {"last_name": {"$regex": term}},
            {"display_name": {"$regex": term}},
            {"primary_diagnosis": {"$regex": term}}
        ]
        if term.isdigit():
            or_conditions.append({"id": int(term)})
            or_conditions.append({"source_patient_id": int(term)})

        cursor = self.col.find({"$or": or_conditions}).limit(limit)
        return serialize_docs(list(cursor))

    def find_duplicates(self, first_name: str, last_name: str, dob: str, phone: Optional[str] = None, mrn: Optional[str] = None) -> List[Dict[str, Any]]:
        or_clauses = []
        if mrn:
            or_clauses.append({"mrn": mrn.strip()})
        if first_name and last_name:
            or_clauses.append({"first_name": {"$regex": first_name.strip()}, "last_name": {"$regex": last_name.strip()}})
        elif first_name:
            or_clauses.append({"first_name": {"$regex": first_name.strip()}})
        elif last_name:
            or_clauses.append({"last_name": {"$regex": last_name.strip()}})
        if phone:
            or_clauses.append({"phone": phone.strip()})

        if not or_clauses:
            return []

        cursor = self.col.find({"$or": or_clauses}).limit(10)
        return serialize_docs(list(cursor))


patient_repository = PatientRepository()
