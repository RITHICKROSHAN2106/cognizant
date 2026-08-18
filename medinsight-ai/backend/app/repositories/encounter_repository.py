import logging
from typing import Dict, Any, List, Optional
from app.database.mongodb import get_mongodb, serialize_doc, serialize_docs

logger = logging.getLogger("medinsight.encounter_repo")


class EncounterRepository:
    def __init__(self, db=None):
        self._db = db

    @property
    def col(self):
        return (self._db if self._db is not None else get_mongodb())["encounters"]

    def get_by_id(self, encounter_id: int) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"id": encounter_id})
        if not doc:
            doc = self.col.find_one({"source_encounter_id": encounter_id})
        return serialize_doc(doc)

    def get_by_encounter_identifier(self, encounter_id_str: str) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"encounter_id": encounter_id_str})
        return serialize_doc(doc)

    def get_by_patient_id(self, patient_id: int) -> List[Dict[str, Any]]:
        cursor = self.col.find({"patient_id": patient_id}).sort("id", -1)
        return serialize_docs(list(cursor))

    def create(self, encounter_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.col.insert_one(encounter_data)
        saved = self.col.find_one({"id": encounter_data["id"]})
        if not saved:
            raise RuntimeError("Failed to verify encounter document persistence in MongoDB.")
        return serialize_doc(saved)

    def update(self, encounter_id: int, update_fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.col.update_one({"id": encounter_id}, {"$set": update_fields})
        updated = self.col.find_one({"id": encounter_id})
        return serialize_doc(updated)

    def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        return self.col.count_documents(query or {})


encounter_repository = EncounterRepository()
