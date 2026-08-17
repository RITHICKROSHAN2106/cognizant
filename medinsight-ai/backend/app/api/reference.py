from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.schemas.schemas import ApiResponse
from app.security.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/reference", tags=["Clinical Reference Data"])

DEPARTMENTS = [
    {"id": "dept_internal", "name": "Internal Medicine", "head": "Dr. Sarah Mitchell", "beds": 40},
    {"id": "dept_cardiology", "name": "Cardiology", "head": "Dr. Robert Vance", "beds": 28},
    {"id": "dept_endocrinology", "name": "Endocrinology & Diabetology", "head": "Dr. Marcus Chen", "beds": 20},
    {"id": "dept_pulmonology", "name": "Pulmonology", "head": "Dr. Emily Taylor", "beds": 24},
    {"id": "dept_surgery", "name": "General Surgery", "head": "Dr. David Sterling", "beds": 32},
    {"id": "dept_icu", "name": "Intensive Care Unit (ICU)", "head": "Dr. Elena Rostova", "beds": 16},
    {"id": "dept_emergency", "name": "Emergency Department", "head": "Dr. Anthony Walsh", "beds": 25}
]

WARDS = [
    {"id": "ward_5b", "name": "Ward 5B (Internal Medicine)", "department": "Internal Medicine", "rooms": 20, "floor": 5},
    {"id": "ward_4a", "name": "Ward 4A (Cardiology)", "department": "Cardiology", "rooms": 14, "floor": 4},
    {"id": "ward_3b", "name": "Ward 3B (Pulmonology)", "department": "Pulmonology", "rooms": 12, "floor": 3},
    {"id": "ward_5a", "name": "Ward 5A (Inpatient General)", "department": "Internal Medicine", "rooms": 18, "floor": 5},
    {"id": "ward_icu_sd", "name": "ICU Step-down Unit", "department": "Intensive Care Unit (ICU)", "rooms": 8, "floor": 2},
    {"id": "ward_surg_2b", "name": "Surgical 2B", "department": "General Surgery", "rooms": 16, "floor": 2}
]

SPECIALTIES = [
    "InternalMedicine", "Emergency/Trauma", "Family/GeneralPractice",
    "Cardiology", "Surgery-General", "Nephrology", "Orthopedics",
    "Orthopedics-Reconstructive", "Radiologist", "Pulmonology", "Gastroenterology", "Neurology"
]


@router.get("/departments", response_model=ApiResponse[List[Dict[str, Any]]])
def get_departments(current_user: CurrentUser = Depends(get_current_user)):
    return ApiResponse(success=True, data=DEPARTMENTS, message="Departments list retrieved")


@router.get("/wards", response_model=ApiResponse[List[Dict[str, Any]]])
def get_wards(current_user: CurrentUser = Depends(get_current_user)):
    return ApiResponse(success=True, data=WARDS, message="Wards list retrieved")


@router.get("/specialties", response_model=ApiResponse[List[str]])
def get_specialties(current_user: CurrentUser = Depends(get_current_user)):
    return ApiResponse(success=True, data=SPECIALTIES, message="Medical specialties retrieved")
