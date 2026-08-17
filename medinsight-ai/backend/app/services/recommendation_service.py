import os
import datetime
import logging
from typing import List, Optional, Dict, Any
from app.schemas.schemas import RecommendationSchema, RecommendationCreate
from app.core.config import settings

logger = logging.getLogger(__name__)


class RecommendationService:

    @classmethod
    def get_recommendations_for_patient(
        cls,
        patient_id: int,
        db
    ) -> List[Dict[str, Any]]:
        # Query existing recommendations
        recs = list(db["recommendations"].find({"patient_id": patient_id}))
        if recs:
            return recs

        # If none exist yet, generate personalized clinical recommendations
        return cls.generate_recommendations(patient_id, db)

    @classmethod
    def generate_recommendations(
        cls,
        patient_id: int,
        db
    ) -> List[Dict[str, Any]]:
        patient = db["patients"].find_one({"id": patient_id})
        if not patient:
            return []

        # Check patient encounters, labs, meds
        labs = list(db["lab_results"].find({"patient_id": patient_id}))
        meds = list(db["medications"].find({"patient_id": patient_id, "is_active": True}))
        diagnoses = list(db["diagnoses"].find({"patient_id": patient_id}))

        high_a1c = any("a1c" in l.get("test_name", "").lower() and l.get("value", 0) > 8.0 for l in labs)
        has_diabetes = any("diabetes" in d.get("description", "").lower() for d in diagnoses)
        has_ckd = any("kidney" in d.get("description", "").lower() or "ckd" in d.get("description", "").lower() for d in diagnoses)
        insulin_med = any("insulin" in m.get("medication_name", "").lower() for m in meds)
        polypharmacy = len(meds) >= 8

        generated_items = []

        # Rule 1: High Readmission Clinical Follow-up
        generated_items.append({
            "title": "Priority Post-Discharge Clinical Follow-up (within 7 Days)",
            "priority": "Urgent",
            "reason": f"High 30-day readmission risk profile with {len(diagnoses)} active comorbidities. Schedule in-person primary care physician visit.",
            "responsible_team": "Care Coordination",
            "source": "AI_generated",
            "due_date": "Within 7 days of discharge"
        })

        # Rule 2: Medication Reconciliation
        if polypharmacy or insulin_med:
            generated_items.append({
                "title": "Comprehensive Pharmacist Medication Reconciliation",
                "priority": "High",
                "reason": f"Patient is prescribed {len(meds)} active medications including insulin titration. High risk of drug-drug interactions or non-adherence.",
                "responsible_team": "Clinical Pharmacy",
                "source": "AI_generated",
                "due_date": "Prior to discharge"
            })

        # Rule 3: Diabetes Educator Referral
        if high_a1c or has_diabetes or insulin_med:
            generated_items.append({
                "title": "Certified Diabetes Care and Education Specialist (CDCES) Referral",
                "priority": "High",
                "reason": "Elevated HbA1c and adjusted insulin regimen require tailored diabetes self-management education and hypoglycemia safety review.",
                "responsible_team": "Endocrinology / Diabetes Education",
                "source": "AI_generated",
                "due_date": "Within 5 days"
            })

        # Rule 4: Home Monitoring
        if has_diabetes or has_ckd:
            generated_items.append({
                "title": "Cellular-Connected Home Glucose & BP Monitoring Setup",
                "priority": "Medium",
                "reason": "Enable remote patient telemetry to identify glycemic spikes and hemodynamic changes before acute decompensation.",
                "responsible_team": "Digital Health / Care Coordination",
                "source": "AI_generated",
                "due_date": "At discharge"
            })

        # Rule 5: Repeat Lab Schedule
        if high_a1c or has_ckd:
            generated_items.append({
                "title": "Repeat Renal Function & HbA1c Lab Panel in 30 Days",
                "priority": "Medium",
                "reason": "Monitor therapeutic response to dosage modifications and renal clearance stability.",
                "responsible_team": "Outpatient Lab Services",
                "source": "rule_based",
                "due_date": "30 days post-discharge"
            })

        saved_recs = []
        all_recs = db["recommendations"].find()
        max_id = max([r.get("id", 0) for r in all_recs], default=0)

        for i, item in enumerate(generated_items, start=1):
            doc = {
                "id": max_id + i,
                "patient_id": patient_id,
                "encounter_id": None,
                "title": item["title"],
                "priority": item["priority"],
                "reason": item["reason"],
                "responsible_team": item["responsible_team"],
                "status": "Pending",
                "due_date": item["due_date"],
                "source": item["source"],
                "is_completed": False,
                "created_at": datetime.datetime.utcnow().isoformat()
            }
            db["recommendations"].insert_one(doc)
            saved_recs.append(doc)

        return saved_recs

    @classmethod
    def add_recommendation(
        cls,
        patient_id: int,
        rec_data: RecommendationCreate,
        db
    ) -> Dict[str, Any]:
        all_recs = db["recommendations"].find()
        max_id = max([r.get("id", 0) for r in all_recs], default=0)
        doc = {
            "id": max_id + 1,
            "patient_id": patient_id,
            "encounter_id": None,
            "title": rec_data.title,
            "priority": rec_data.priority,
            "reason": rec_data.reason,
            "responsible_team": rec_data.responsible_team,
            "status": "Pending",
            "due_date": rec_data.due_date,
            "source": rec_data.source,
            "is_completed": False,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        db["recommendations"].insert_one(doc)
        return doc

    @classmethod
    def toggle_recommendation_status(
        cls,
        rec_id: int,
        db
    ) -> Optional[Dict[str, Any]]:
        rec = db["recommendations"].find_one({"id": rec_id})
        if not rec:
            return None
        new_is_completed = not rec.get("is_completed", False)
        new_status = "Completed" if new_is_completed else "Pending"
        db["recommendations"].update_one(
            {"id": rec_id},
            {"$set": {"is_completed": new_is_completed, "status": new_status, "completed_at": datetime.datetime.utcnow().isoformat() if new_is_completed else None}}
        )
        return db["recommendations"].find_one({"id": rec_id})


recommendation_service = RecommendationService()
