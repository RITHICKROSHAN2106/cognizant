from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.database.mongodb import get_mongodb
from app.services.fhir_service import fhir_service

router = APIRouter(prefix="/fhir", tags=["HL7 FHIR Interoperability"])


@router.get("/patient/{patient_id}")
def get_fhir_patient(patient_id: int, db=Depends(get_mongodb)) -> Dict[str, Any]:
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FHIR Patient not found")
    return fhir_service.patient_to_fhir(patient)


@router.get("/patient/{patient_id}/observations")
def get_fhir_observations(patient_id: int, db=Depends(get_mongodb)) -> Dict[str, Any]:
    observations = list(db["observations"].find({"patient_id": patient_id}))
    entries = [{"resource": fhir_service.observation_to_fhir(o)} for o in observations]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }


@router.get("/patient/{patient_id}/conditions")
def get_fhir_conditions(patient_id: int, db=Depends(get_mongodb)) -> Dict[str, Any]:
    diagnoses = list(db["diagnoses"].find({"patient_id": patient_id}))
    entries = [{"resource": fhir_service.condition_to_fhir(d)} for d in diagnoses]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }


@router.get("/patient/{patient_id}/medications")
def get_fhir_medications(patient_id: int, db=Depends(get_mongodb)) -> Dict[str, Any]:
    medications = list(db["medications"].find({"patient_id": patient_id}))
    entries = [{"resource": fhir_service.medication_to_fhir(m)} for m in medications]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }
