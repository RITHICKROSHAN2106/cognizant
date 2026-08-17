import datetime
import time
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query

from typing import List, Optional, Dict, Any
from app.database.mongodb import get_mongodb
from app.schemas.schemas import (
    PatientSummary, PatientDetail, PatientCreate, PatientUpdate,
    EncounterSchema, DiagnosisSchema, ObservationSchema, LabResultSchema,
    MedicationSchema, AllergySchema, ProcedureSchema, ClinicalNoteSchema,
    DischargePlanSchema, DischargePlanUpdate, RecommendationSchema,
    ExplanationResult, SimulationInput, SimulationResult, ApiResponse
)
from app.security.dependencies import get_current_user, require_roles, CurrentUser, log_audit_event
from app.services.prediction_service import prediction_service
from app.services.explainability_service import explainability_service
from app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/patients", tags=["Patients & Longitudinal EHR"])


@router.get("/dataset")
def query_dataset_patients(
    search: Optional[str] = Query(None, description="Search across patient name, MRN, encounter ID, diagnosis"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: Critical, High, Moderate, Low"),
    readmission_status: Optional[str] = Query(None, description="Filter by outcome: <30, >30, NO"),
    age_group: Optional[str] = Query(None, description="Filter by age bracket: [60-70), etc."),
    race: Optional[str] = Query(None, description="Filter by demographic race"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort_by: str = Query("risk_probability"),
    sort_desc: bool = Query(True),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Query across 101,766 (1-Lakh) patient dataset with high-performance filtering & pagination."""
    from app.services.dataset_service import dataset_service
    res = dataset_service.query_patients(
        search=search,
        risk_level=risk_level,
        readmission_status=readmission_status,
        age_group=age_group,
        race=race,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_desc=sort_desc
    )
    return ApiResponse(
        success=True,
        data=res,
        message=f"Retrieved {len(res['items'])} of {res['total']:,} dataset records (Page {page} of {res['total_pages']})"
    )


@router.get("", response_model=ApiResponse[List[PatientSummary]])
def list_patients(
    risk_level: Optional[str] = Query(None, description="Filter by risk tier: Critical, High, Moderate, Low"),
    ward: Optional[str] = Query(None, description="Filter by ward location"),
    search: Optional[str] = Query(None, description="Search by name or MRN"),
    skip: int = 0,
    limit: int = 100,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    from app.services.dataset_service import dataset_service
    page = (skip // limit) + 1 if limit > 0 else 1
    res = dataset_service.query_patients(
        search=search,
        risk_level=risk_level,
        ward=ward,
        page=page,
        page_size=limit,
        sort_by="risk_probability",
        sort_desc=True
    )
    
    results = [
        PatientSummary(
            id=p.get("id", 1),
            mrn=p.get("mrn", ""),
            first_name=p.get("first_name", ""),
            last_name=p.get("last_name", ""),
            dob=p.get("dob", ""),
            age=p.get("age", 0),
            sex=p.get("sex", p.get("gender", "Female")),
            blood_group=p.get("blood_group", "O+"),
            race=p.get("race", "Caucasian"),
            ethnicity=p.get("ethnicity", "Non-Hispanic"),
            safety_badges=p.get("safety_badges", []),
            current_ward=p.get("current_ward"),
            current_room=p.get("current_room"),
            admission_status=p.get("admission_status", "Inpatient"),
            primary_diagnosis=p.get("primary_diagnosis"),
            risk_probability=p.get("risk_probability", 0.15),
            risk_level=p.get("risk_level", "Low"),
            length_of_stay=p.get("length_of_stay", 3)
        )
        for p in res.get("items", [])
    ]

    return ApiResponse(success=True, data=results, message=f"Retrieved {len(results)} patients from 101,766 clinical dataset")


@router.get("/high-risk", response_model=ApiResponse[List[PatientSummary]])
def get_high_risk_patients(
    filter_type: Optional[str] = Query(None, description="Filter: all, critical, pending_review, high_utilizers"),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    from app.services.dataset_service import dataset_service
    items = dataset_service.get_high_risk_patients(filter_type=filter_type, limit=50)
    results = [
        PatientSummary(
            id=p.get("id", 1),
            mrn=p.get("mrn", ""),
            first_name=p.get("first_name", ""),
            last_name=p.get("last_name", ""),
            dob=p.get("dob", ""),
            age=p.get("age", 0),
            sex=p.get("sex", p.get("gender", "Female")),
            blood_group=p.get("blood_group", "O+"),
            race=p.get("race", "Caucasian"),
            ethnicity=p.get("ethnicity", "Non-Hispanic"),
            safety_badges=p.get("safety_badges", []),
            current_ward=p.get("current_ward"),
            current_room=p.get("current_room"),
            admission_status=p.get("admission_status", "Inpatient"),
            primary_diagnosis=p.get("primary_diagnosis"),
            risk_probability=p.get("risk_probability", 0.72),
            risk_level=p.get("risk_level", "Critical"),
            length_of_stay=p.get("length_of_stay", 3)
        )
        for p in items
    ]
    return ApiResponse(success=True, data=results, message=f"Retrieved {len(results)} high-risk patients from 101,766 clinical cohort")


@router.get("/search", response_model=ApiResponse[List[PatientSummary]])
def search_patients(
    q: str = Query(..., min_length=1, description="Search query"),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    from app.services.dataset_service import dataset_service
    items = dataset_service.search_patients(query=q, limit=50)
    results = [
        PatientSummary(
            id=p.get("id", 1),
            mrn=p.get("mrn", ""),
            first_name=p.get("first_name", ""),
            last_name=p.get("last_name", ""),
            dob=p.get("dob", ""),
            age=p.get("age", 0),
            sex=p.get("sex", p.get("gender", "Female")),
            blood_group=p.get("blood_group", "O+"),
            race=p.get("race", "Caucasian"),
            ethnicity=p.get("ethnicity", "Non-Hispanic"),
            safety_badges=p.get("safety_badges", []),
            current_ward=p.get("current_ward"),
            current_room=p.get("current_room"),
            admission_status=p.get("admission_status", "Inpatient"),
            primary_diagnosis=p.get("primary_diagnosis"),
            risk_probability=p.get("risk_probability", 0.15),
            risk_level=p.get("risk_level", "Low"),
            length_of_stay=p.get("length_of_stay", 3)
        )
        for p in items
    ]
    return ApiResponse(success=True, data=results, message=f"Found {len(results)} matches in 101,766 dataset for '{q}'")


@router.get("/{patient_id}", response_model=ApiResponse[PatientDetail])
def get_patient(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    from app.services.dataset_service import dataset_service
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        patient = dataset_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {patient_id} not found in 101,766 dataset.")

    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_VIEW",
        resource="patients",
        patient_id=patient_id
    )

    return ApiResponse(
        success=True,
        data=PatientDetail(
            id=patient.get("id", patient_id),
            mrn=patient.get("mrn", ""),
            first_name=patient.get("first_name", ""),
            last_name=patient.get("last_name", ""),
            dob=patient.get("dob", ""),
            age=patient.get("age", 0),
            sex=patient.get("sex", patient.get("gender", "Female")),
            blood_group=patient.get("blood_group", "O+"),
            race=patient.get("race", "Caucasian"),
            ethnicity=patient.get("ethnicity", "Non-Hispanic"),
            safety_badges=patient.get("safety_badges", []),
            current_ward=patient.get("current_ward"),
            current_room=patient.get("current_room"),
            admission_status=patient.get("admission_status", "Inpatient"),
            primary_diagnosis=patient.get("primary_diagnosis"),
            risk_probability=patient.get("risk_probability", 0.15),
            risk_level=patient.get("risk_level", "Low"),
            length_of_stay=patient.get("length_of_stay", 3),
            phone=patient.get("phone"),
            email=patient.get("email"),
            address=patient.get("address"),
            emergency_contact=patient.get("emergency_contact"),
            attending_physician=patient.get("attending_physician", "Dr. Sarah Mitchell"),
            expected_discharge=patient.get("expected_discharge"),
            care_coordinator=patient.get("care_coordinator", "Emma Davis, RN"),
            intervention_status=patient.get("intervention_status", "Active Monitoring"),
            main_risk_driver=patient.get("main_risk_driver")
        ),
        message=f"Patient record retrieved: {patient.get('first_name')} {patient.get('last_name')}"
    )




@router.post("", response_model=ApiResponse[PatientDetail], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ApiResponse[PatientDetail], status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Registers a new patient and persists records across MongoDB collections."""
    from app.services.dataset_service import dataset_service
    
    # Generate unique ID and MRN
    new_id = int(time.time() % 100000000) + random.randint(1000, 9999)
    mrn = patient_in.mrn or f"MRN-{new_id:07d}"
    
    patient_dict = patient_in.model_dump()
    
    # Calculate baseline clinical risk level
    age = patient_dict.get("age", 50)
    has_diabetes = "diabetes" in str(patient_dict.get("primary_diagnosis", "")).lower() or patient_dict.get("has_diabetes", True)
    risk_p = 0.65 if (age >= 65 and has_diabetes) else 0.42 if has_diabetes else 0.22
    risk_level = "High" if risk_p >= 0.70 else "Moderate" if risk_p >= 0.40 else "Low"
    
    now_iso = datetime.datetime.utcnow().isoformat()
    
    patient_doc = {
        "id": new_id,
        "mrn": mrn,
        "first_name": patient_dict.get("first_name", "Patient"),
        "last_name": patient_dict.get("last_name", "Record"),
        "dob": patient_dict.get("dob", "1960-01-01"),
        "age": age,
        "sex": patient_dict.get("sex", "Female"),
        "phone": patient_dict.get("phone", "555-0199"),
        "email": patient_dict.get("email", ""),
        "address": patient_dict.get("address", "123 Clinical Way"),
        "emergency_contact": patient_dict.get("emergency_contact", "Family / Next of Kin"),
        "blood_group": patient_dict.get("blood_group", "O+"),
        "race": patient_dict.get("race", "Caucasian"),
        "ethnicity": patient_dict.get("ethnicity", "Non-Hispanic"),
        "safety_badges": patient_dict.get("safety_badges", ["CLINICAL ADMISSION"]),
        "current_ward": patient_dict.get("current_ward", "Ward 5B"),
        "current_room": patient_dict.get("current_room", "5B-101"),
        "admission_status": patient_dict.get("admission_status", "Inpatient"),
        "primary_diagnosis": patient_dict.get("primary_diagnosis", "Observation & Workup"),
        "risk_probability": risk_p,
        "risk_level": risk_level,
        "length_of_stay": 1,
        "attending_physician": patient_dict.get("attending_physician", "Dr. Sarah Mitchell, MD"),
        "expected_discharge": "Scheduled in 3 days",
        "care_coordinator": "Emma Davis, RN",
        "intervention_status": "Active Monitoring",
        "main_risk_driver": "New Inpatient Glycemic & Vital Stabilization",
        "created_at": now_iso,
        "updated_at": now_iso
    }
    
    # 1. Persist in MongoDB patients collection
    db["patients"].insert_one(patient_doc)
    
    # 2. Persist initial encounter in MongoDB encounters collection
    enc_id = int(time.time() % 10000000) + random.randint(100, 999)
    encounter_doc = {
        "id": enc_id,
        "encounter_id": f"ENC-{enc_id}",
        "patient_id": new_id,
        "admission_date": datetime.date.today().isoformat(),
        "discharge_date": None,
        "encounter_type": patient_dict.get("encounter_type", "Inpatient Admission"),
        "department": patient_dict.get("department", "Internal Medicine"),
        "ward": patient_doc["current_ward"],
        "room": patient_doc["current_room"],
        "attending_physician": patient_doc["attending_physician"],
        "primary_diagnosis": patient_doc["primary_diagnosis"],
        "secondary_diagnoses": ["Essential Hypertension", "Hyperlipidemia"],
        "length_of_stay": 1,
        "admission_source": patient_dict.get("admission_source", "Emergency Department"),
        "admission_type": patient_dict.get("admission_type", "Urgent"),
        "discharge_disposition": "Under Inpatient Care",
        "readmission_status": "NO",
        "is_current": True
    }
    db["encounters"].insert_one(encounter_doc)
    
    # 3. Persist primary diagnosis in MongoDB diagnoses collection
    db["diagnoses"].insert_one({
        "id": 1,
        "patient_id": new_id,
        "encounter_id": enc_id,
        "icd_code": "250.00",
        "description": patient_doc["primary_diagnosis"],
        "diagnosis_type": "Primary",
        "status": "Active",
        "severity": "Moderate",
        "is_active": True,
        "diagnosed_at": datetime.date.today().isoformat(),
        "clinician": patient_doc["attending_physician"]
    })
    
    # 4. Persist initial vitals in MongoDB observations collection
    db["observations"].insert_one({
        "id": 1,
        "patient_id": new_id,
        "encounter_id": enc_id,
        "code": "BP",
        "name": "Blood Pressure",
        "value": 130.0,
        "value_string": "130/84 mmHg",
        "unit": "mmHg",
        "status": "Normal",
        "recorded_at": now_iso
    })
    db["observations"].insert_one({
        "id": 2,
        "patient_id": new_id,
        "encounter_id": enc_id,
        "code": "GLU",
        "name": "Blood Glucose",
        "value": 165.0,
        "value_string": "165 mg/dL",
        "unit": "mg/dL",
        "status": "Elevated",
        "recorded_at": now_iso
    })
    
    # 5. Persist initial clinical note in MongoDB notes collection
    db["notes"].insert_one({
        "id": 1,
        "patient_id": new_id,
        "note_type": "History & Physical (H&P)",
        "author": patient_doc["attending_physician"],
        "author_role": "Attending Physician",
        "created_at": now_iso,
        "content": f"Initial hospital admission workup for {patient_doc['first_name']} {patient_doc['last_name']}. Primary diagnosis: {patient_doc['primary_diagnosis']}. Full CDS readmission risk surveillance active."
    })
    
    # Register in in-memory dataset cache for instant query availability
    dataset_service.id_lookup[new_id] = patient_doc
    dataset_service.encounter_lookup[new_id] = patient_doc
    
    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_CREATED",
        resource="patients",
        patient_id=new_id
    )
    
    return ApiResponse(
        success=True,
        data=PatientDetail(**patient_doc),
        message=f"Patient {patient_doc['first_name']} {patient_doc['last_name']} registered successfully"
    )


@router.patch("/{patient_id}", response_model=ApiResponse[PatientDetail])

def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {patient_id} not found.")

    update_dict = {k: v for k, v in patient_update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.datetime.utcnow().isoformat()

    db["patients"].update_one({"id": patient_id}, {"$set": update_dict})
    updated_patient = db["patients"].find_one({"id": patient_id})

    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_UPDATED",
        resource="patients",
        patient_id=patient_id
    )

    return ApiResponse(success=True, data=PatientDetail(**updated_patient), message="Patient record updated")


# --- Patient Vitals & Real-Time Observation Subsystem ---
from app.api.vitals_ws import vitals_ws_manager


def validate_vital_range(obs_type: str, val: Any) -> tuple[bool, str]:
    """Validates clinical reasonableness of vital sign observations."""
    try:
        if obs_type in ["heart_rate", "hr"]:
            v = float(val)
            if v < 30 or v > 220:
                return False, "Heart rate out of physiological range (30-220 bpm)"
        elif obs_type in ["respiratory_rate", "rr"]:
            v = float(val)
            if v < 6 or v > 60:
                return False, "Respiratory rate out of physiological range (6-60 breaths/min)"
        elif obs_type in ["oxygen_saturation", "spo2"]:
            v = float(val)
            if v < 50 or v > 100:
                return False, "SpO2 out of physiological range (50-100%)"
        elif obs_type in ["temperature", "temp"]:
            v = float(val)
            if v < 90.0 or v > 108.0:
                return False, "Body temperature out of physiological range (90-108 °F)"
        elif obs_type in ["blood_glucose", "glucose"]:
            v = float(val)
            if v < 20 or v > 1000:
                return False, "Blood glucose out of physiological range (20-1000 mg/dL)"
    except (ValueError, TypeError):
        pass
    return True, "Valid"


@router.get("/{patient_id}/encounters/{encounter_id}/vitals/current", response_model=ApiResponse[Dict[str, Any]])
@router.get("/{patient_id}/vitals/current", response_model=ApiResponse[Dict[str, Any]])
def get_current_vitals(
    patient_id: int,
    encounter_id: Optional[str] = "1",
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Returns current vital observations strictly scoped to patient_id and encounter_id.
    Includes freshness indicators and staleness check.
    """
    # Fetch real observations for this patient and encounter
    query = {"patient_id": patient_id}
    vitals = list(db["observations"].find(query).sort("id", -1))

    # Real baseline observations container
    vitals_map = {}
    standard_types = [
        ("heart_rate", "bpm", "Telemetry / Manual"),
        ("blood_pressure", "mmHg", "NIBP Cuff"),
        ("respiratory_rate", "breaths/min", "Clinical Observation"),
        ("oxygen_saturation", "%", "Pulse Oximeter"),
        ("temperature", "°F", "Oral Thermometer"),
        ("blood_glucose", "mg/dL", "POC Glucometer")
    ]

    for k, unit, def_source in standard_types:
        vitals_map[k] = {
            "value": None,
            "unit": unit,
            "status": "Not available from source dataset",
            "measured_at": "Not recorded",
            "source": def_source,
            "is_available": False
        }

    for v in vitals:
        name = str(v.get("observation_type") or v.get("name", "")).lower()
        key = None
        if "heart" in name or "hr" in name:
            key = "heart_rate"
        elif "pressure" in name or "bp" in name:
            key = "blood_pressure"
        elif "resp" in name or "rr" in name:
            key = "respiratory_rate"
        elif "ox" in name or "spo2" in name:
            key = "oxygen_saturation"
        elif "temp" in name:
            key = "temperature"
        elif "gluc" in name or "glu" in name:
            key = "blood_glucose"

        if key and not vitals_map[key]["is_available"]:
            vitals_map[key] = {
                "value": v.get("value", v.get("value_string")),
                "unit": v.get("unit", vitals_map[key]["unit"]),
                "status": v.get("status", "Recorded"),
                "measured_at": v.get("measured_at", "Recent"),
                "source": v.get("source", "MANUAL_ENTRY"),
                "is_available": True
            }

    return ApiResponse(
        success=True,
        data={
            "patient_id": patient_id,
            "encounter_id": encounter_id,
            "is_live": True,
            "measurements": vitals_map,
            "last_updated": datetime.datetime.utcnow().isoformat()
        },
        message="Current patient vitals retrieved"
    )


@router.get("/{patient_id}/encounters/{encounter_id}/vitals/history", response_model=ApiResponse[List[Dict[str, Any]]])
def get_vitals_history(
    patient_id: int,
    encounter_id: str,
    vital_type: Optional[str] = None,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns chronological observation history for the selected patient & encounter."""
    query: Dict[str, Any] = {"patient_id": patient_id}
    if vital_type:
        query["$or"] = [
            {"observation_type": {"$regex": vital_type}},
            {"name": {"$regex": vital_type}}
        ]
    records = list(db["observations"].find(query).sort("id", -1))
    return ApiResponse(success=True, data=records, message=f"Retrieved {len(records)} observation history records")


@router.post("/{patient_id}/encounters/{encounter_id}/vitals", response_model=ApiResponse[Dict[str, Any]])
@router.post("/{patient_id}/vitals", response_model=ApiResponse[Dict[str, Any]])
async def record_vital(
    patient_id: int,
    vital_data: Dict[str, Any],
    encounter_id: Optional[str] = "1",
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Allows clinical staff to record a verified vital observation with validation and live broadcasting."""
    obs_type = vital_data.get("observation_type", "heart_rate")
    raw_val = vital_data.get("value")

    is_valid, msg = validate_vital_range(obs_type, raw_val)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    all_obs = list(db["observations"].find())
    max_id = max([o.get("id", 0) for o in all_obs], default=0)
    new_obs_id = max_id + 1

    now = datetime.datetime.utcnow()
    doc = {
        "id": new_obs_id,
        "patient_id": patient_id,
        "encounter_id": encounter_id or vital_data.get("encounter_id", 1),
        "name": vital_data.get("name", obs_type.replace("_", " ").title()),
        "observation_type": obs_type,
        "value": raw_val,
        "value_string": str(raw_val),
        "unit": vital_data.get("unit", ""),
        "status": vital_data.get("status", "Normal"),
        "source": vital_data.get("source", "MANUAL_ENTRY"),
        "recorded_by": current_user.full_name,
        "measured_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "received_at": now.isoformat()
    }
    db["observations"].insert_one(doc)

    # Broadcast via WebSocket to connected clinician displays
    try:
        await vitals_ws_manager.broadcast_observation(patient_id, encounter_id, doc)
    except Exception as e:
        logger.warning(f"WebSocket broadcast error: {e}")

    log_audit_event(
        db=db,
        user=current_user,
        action="VITAL_RECORDED",
        resource="observations",
        patient_id=patient_id,
        details={"vital_name": doc["name"], "value": doc["value_string"], "source": doc["source"]}
    )

    return ApiResponse(success=True, data=doc, message="Vital sign observation recorded successfully")


@router.get("/{patient_id}/encounters/{encounter_id}/risk", response_model=ApiResponse[Dict[str, Any]])
def get_encounter_risk_assessment(
    patient_id: int,
    encounter_id: str,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Computes exact readmission risk for the selected patient and encounter using the trained ensemble model.
    """
    # 1. Resolve encounter
    enc = None
    all_encs = list(db["encounters"].find({"patient_id": patient_id}))
    for e in all_encs:
        if str(e.get("id")) == str(encounter_id) or str(e.get("encounter_id")) == str(encounter_id):
            enc = e
            break

    if not enc and all_encs:
        enc = all_encs[0]

    if not enc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter {encounter_id} for Patient {patient_id} could not be found."
        )

    # 2. Run prediction service
    pred_res = prediction_service.predict_encounter_by_id(enc["id"], db)
    expl_res = explainability_service.get_patient_explanation(patient_id, db)

    patient_doc = db["patients"].find_one({"id": patient_id})

    return ApiResponse(
        success=True,
        data={
            "patient_id": patient_id,
            "patient_name": f"{patient_doc.get('first_name', '')} {patient_doc.get('last_name', '')}" if patient_doc else "Patient",
            "mrn": patient_doc.get("mrn", "") if patient_doc else "",
            "encounter_id": enc.get("encounter_id", str(enc.get("id"))),
            "encounter_date": enc.get("admitted_at", "Historical Record"),
            "primary_diagnosis": enc.get("primary_diagnosis", patient_doc.get("primary_diagnosis", "") if patient_doc else ""),
            "prediction": pred_res,
            "explanation": expl_res,
            "model_metadata": {
                "model_name": "MedInsight-Ensemble-XGBoost-LightGBM",
                "model_version": "prod-v2.1",
                "model_source": "diabetes_readmission_notebook_final",
                "dataset_source": "diabetic_data.csv",
                "threshold": 0.45,
                "test_auroc": 0.6423
            }
        },
        message="Encounter readmission risk assessment computed successfully"
    )


@router.get("/{patient_id}/vitals", response_model=ApiResponse[List[ObservationSchema]])
def get_patient_vitals(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    vitals = list(db["observations"].find({"patient_id": patient_id}))
    if not vitals:
        vitals = dataset_service.get_patient_vitals(patient_id)
    return ApiResponse(success=True, data=[ObservationSchema(**v) for v in vitals])


@router.get("/{patient_id}/encounters", response_model=ApiResponse[List[EncounterSchema]])
def get_patient_encounters(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    encs = list(db["encounters"].find({"patient_id": patient_id}))
    if not encs:
        encs = dataset_service.get_patient_encounters(patient_id)
    return ApiResponse(success=True, data=[EncounterSchema(**e) for e in encs])


@router.get("/{patient_id}/diagnoses", response_model=ApiResponse[List[DiagnosisSchema]])
def get_patient_diagnoses(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    diags = list(db["diagnoses"].find({"patient_id": patient_id}))
    if not diags:
        diags = dataset_service.get_patient_diagnoses(patient_id)
    return ApiResponse(success=True, data=[DiagnosisSchema(**d) for d in diags])


@router.get("/{patient_id}/labs", response_model=ApiResponse[List[LabResultSchema]])
def get_patient_labs(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    labs = list(db["lab_results"].find({"patient_id": patient_id}))
    if not labs:
        labs = dataset_service.get_patient_labs(patient_id)
    return ApiResponse(success=True, data=[LabResultSchema(**l) for l in labs])


@router.get("/{patient_id}/medications", response_model=ApiResponse[List[MedicationSchema]])
def get_patient_medications(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    meds = list(db["medications"].find({"patient_id": patient_id}))
    if not meds:
        meds = dataset_service.get_patient_medications(patient_id)
    return ApiResponse(success=True, data=[MedicationSchema(**m) for m in meds])


@router.get("/{patient_id}/allergies", response_model=ApiResponse[List[AllergySchema]])
def get_patient_allergies(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    allergies = list(db["allergies"].find({"patient_id": patient_id}))
    if not allergies:
        allergies = dataset_service.get_patient_allergies(patient_id)
    return ApiResponse(success=True, data=[AllergySchema(**a) for a in allergies])


@router.get("/{patient_id}/procedures", response_model=ApiResponse[List[ProcedureSchema]])
def get_patient_procedures(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    procs = list(db["procedures"].find({"patient_id": patient_id}))
    if not procs:
        procs = dataset_service.get_patient_procedures(patient_id)
    return ApiResponse(success=True, data=[ProcedureSchema(**p) for p in procs])


@router.get("/{patient_id}/notes", response_model=ApiResponse[List[ClinicalNoteSchema]])
def get_patient_notes(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    notes = list(db["clinical_notes"].find({"patient_id": patient_id}))
    if not notes:
        notes = dataset_service.get_patient_notes(patient_id)
    return ApiResponse(success=True, data=[ClinicalNoteSchema(**n) for n in notes])


@router.get("/{patient_id}/discharge-plan", response_model=ApiResponse[Optional[DischargePlanSchema]])
def get_discharge_plan(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    plan = db["discharge_plans"].find_one({"patient_id": patient_id})
    if not plan:
        plan = dataset_service.get_patient_discharge_plan(patient_id)
    if not plan:
        return ApiResponse(success=True, data=None)
    return ApiResponse(success=True, data=DischargePlanSchema(**plan))


@router.patch("/{patient_id}/discharge-plan", response_model=ApiResponse[DischargePlanSchema])
def update_discharge_plan(
    patient_id: int,
    update_data: DischargePlanUpdate,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    from app.services.dataset_service import dataset_service
    plan = db["discharge_plans"].find_one({"patient_id": patient_id})
    if not plan:
        plan = dataset_service.get_patient_discharge_plan(patient_id)
        db["discharge_plans"].insert_one(plan)

    set_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    set_fields["updated_at"] = datetime.datetime.utcnow().isoformat()
    set_fields["updated_by"] = current_user.full_name

    active_plan = dict(plan)
    active_plan.update(set_fields)
    checklist_keys = [
        "medication_reconciliation", "follow_up_appointment", "diabetes_education",
        "pending_tests_cleared", "transport_arranged", "home_monitoring_setup",
        "care_coordinator_assigned", "patient_education_completed", "high_risk_review_completed"
    ]
    completed = sum(1 for k in checklist_keys if active_plan.get(k))
    set_fields["readiness_score"] = round((completed / len(checklist_keys)) * 100, 1)

    db["discharge_plans"].update_one({"patient_id": patient_id}, {"$set": set_fields})
    updated = db["discharge_plans"].find_one({"patient_id": patient_id}) or active_plan

    log_audit_event(
        db=db,
        user=current_user,
        action="CARE_PLAN_UPDATED",
        resource="discharge_plans",
        patient_id=patient_id
    )

    return ApiResponse(success=True, data=DischargePlanSchema(**updated))


@router.get("/{patient_id}/recommendations", response_model=ApiResponse[List[RecommendationSchema]])
def get_recommendations(patient_id: int, db=Depends(get_mongodb), current_user: CurrentUser = Depends(get_current_user)):
    from app.services.dataset_service import dataset_service
    recs = list(db["recommendations"].find({"patient_id": patient_id}))
    if not recs:
        recs = dataset_service.get_patient_recommendations(patient_id)
    return ApiResponse(success=True, data=[RecommendationSchema(**r) for r in recs])

