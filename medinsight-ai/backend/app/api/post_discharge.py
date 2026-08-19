import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel
from app.database.mongodb import get_mongodb
from app.schemas.schemas import (
    ApiResponse, PostDischargeCarePlan, PostDischargePatientSummary,
    FollowUpVisit, FollowUpVisitUpdate, MedicationSupplyItem,
    NutritionPlanSchema, RehabilitationPlanSchema, PatientCoverageSchema,
    ReadmissionEventSchema, EncounterSchema
)
from app.security.dependencies import (
    get_current_user, CurrentUser, require_permission, require_any_permission, log_audit_event
)
from app.security.rbac import PermissionEnum
from app.services.post_discharge_service import post_discharge_service

logger = logging.getLogger("medinsight.post_discharge_api")

router = APIRouter(tags=["Post-Discharge Care & Continuity"])


@router.get("/post-discharge/patients", response_model=ApiResponse[List[PostDischargePatientSummary]])
def list_post_discharge_patients(
    filter_status: Optional[str] = Query("all", description="Filter: all, high_risk, overdue, medication_pending, readmitted"),
    search: Optional[str] = Query(None, description="Search by name, MRN, diagnosis"),
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.FOLLOWUP_VIEW.value))
):
    """Returns population follow-up queue for the Post-Discharge Command Center."""
    items = post_discharge_service.list_post_discharge_patients(
        filter_status=filter_status,
        search=search,
        db=db
    )
    return ApiResponse(
        success=True,
        data=items,
        message=f"Retrieved {len(items)} post-discharge patient records"
    )


@router.get("/post-discharge/counts", response_model=ApiResponse[Dict[str, int]])
def get_post_discharge_counts(
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns dynamic database-backed counts for each post-discharge surveillance category."""
    counts = post_discharge_service.get_post_discharge_counts(db=db)
    return ApiResponse(
        success=True,
        data=counts,
        message="Post-discharge population counts retrieved"
    )


@router.get("/patients/{patient_id}/post-discharge", response_model=ApiResponse[PostDischargeCarePlan])
def get_patient_post_discharge_plan(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Retrieves full post-discharge continuity bundle for a specific patient."""
    try:
        plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
        
        log_audit_event(
            db=db,
            user=current_user,
            action="POST_DISCHARGE_CARE_VIEW",
            resource="post_discharge",
            patient_id=patient_id
        )

        return ApiResponse(
            success=True,
            data=PostDischargeCarePlan(**plan),
            message="Post-discharge care plan retrieved successfully"
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching post-discharge plan for {patient_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/patients/{patient_id}/post-discharge", response_model=ApiResponse[PostDischargeCarePlan])
def update_patient_post_discharge_plan(
    patient_id: Union[int, str],
    plan_update: Dict[str, Any],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.CARE_PLAN_UPDATE.value))
):
    """Updates recovery status, assigned staff, or care coordinator notes."""
    existing = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    now_iso = datetime.datetime.utcnow().isoformat()
    plan_update["updated_at"] = now_iso

    for k, v in plan_update.items():
        if isinstance(v, dict) and isinstance(existing.get(k), dict):
            existing[k].update(v)
        else:
            existing[k] = v
    
    clean_id = existing.get("patient_id") or patient_id

    # Ensure nested sub-models have required identity and date fields
    if existing.get("nutrition_plan") and isinstance(existing["nutrition_plan"], dict):
        np = existing["nutrition_plan"]
        np.setdefault("id", 1)
        np.setdefault("patient_id", clean_id)
        np.setdefault("plan_start_date", existing.get("discharge_date", "2025-01-01"))
        np.setdefault("last_reviewed", now_iso.split("T")[0])
        np.setdefault("next_review", (datetime.datetime.utcnow() + datetime.timedelta(days=14)).isoformat().split("T")[0])
        np.setdefault("restrictions", [])
        np.setdefault("adherence_status", "Adherent")
        np.setdefault("status", "Assigned")

    if existing.get("coverage") and isinstance(existing["coverage"], dict):
        cov = existing["coverage"]
        cov.setdefault("id", 1)
        cov.setdefault("patient_id", clean_id)
        cov.setdefault("valid_from", "2025-01-01")
        cov.setdefault("valid_until", "2026-12-31")
        cov.setdefault("emergency_coverage", True)
        cov.setdefault("rehabilitation_coverage", True)
        cov.setdefault("medication_coverage", True)
        cov.setdefault("dietician_coverage", True)
        cov.setdefault("followup_coverage", True)
        cov.setdefault("coverage_status", "Active")
        cov.setdefault("emergency_support_eligibility", "Eligible")

    if existing.get("rehabilitation_plan") and isinstance(existing["rehabilitation_plan"], dict):
        reb = existing["rehabilitation_plan"]
        reb.setdefault("id", 1)
        reb.setdefault("patient_id", clean_id)
        reb.setdefault("rehabilitation_type", "Mobility Regimen")
        reb.setdefault("start_date", existing.get("discharge_date", "2025-01-01"))
        reb.setdefault("expected_end_date", (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat().split("T")[0])
        reb.setdefault("next_session", (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat().split("T")[0])
        reb.setdefault("frequency", "2 sessions / week")
        reb.setdefault("status", "In Progress")
        reb.setdefault("progress_percentage", 40)
        reb.setdefault("goals", [])
        reb.setdefault("sessions", [])

    if db is not None:
        db["post_discharge_care_plans"].update_one(
            {"patient_id": clean_id},
            {"$set": existing},
            upsert=True
        )
    
    log_audit_event(
        db=db,
        user=current_user,
        action="CARE_PLAN_UPDATED",
        resource="post_discharge",
        patient_id=clean_id
    )

    return ApiResponse(
        success=True,
        data=PostDischargeCarePlan(**existing),
        message="Post-discharge care plan updated successfully"
    )


@router.get("/patients/{patient_id}/follow-ups", response_model=ApiResponse[List[FollowUpVisit]])
def get_patient_follow_ups(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns 4-week follow-up timeline visits."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=[FollowUpVisit(**v) for v in plan.get("follow_up_visits", [])],
        message="Follow-up visits retrieved"
    )


@router.patch("/patients/{patient_id}/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
@router.post("/patients/{patient_id}/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
@router.patch("/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
@router.post("/post-discharge/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
def update_follow_up_visit(
    visit_id: int,
    update_data: FollowUpVisitUpdate,
    patient_id: Optional[Union[int, str]] = None,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.FOLLOWUP_UPDATE.value))
):
    """Updates status, completion, date, or clinical notes of a scheduled follow-up visit."""
    resolved_pid = patient_id
    raw_dict = update_data.model_dump(exclude_unset=True)

    # If patient_id was not explicitly in the URL path, find it from the payload or lookup in care plans
    if resolved_pid is None and "patient_id" in raw_dict:
        resolved_pid = raw_dict["patient_id"]

    if resolved_pid is None and db is not None:
        found_plan = db["post_discharge_care_plans"].find_one({"follow_up_visits.id": visit_id})
        if found_plan:
            resolved_pid = found_plan.get("patient_id")

    if resolved_pid is None:
        resolved_pid = 1  # Default fallback if isolated

    try:
        result = post_discharge_service.update_follow_up_visit(
            patient_id=resolved_pid,
            visit_id=visit_id,
            update_data=raw_dict,
            db=db
        )

        log_audit_event(
            db=db,
            user=current_user,
            action="FOLLOW_UP_VISIT_UPDATED",
            resource="follow_ups",
            details={"visit_id": visit_id, "updated_fields": raw_dict, "completion_rate": result["completion_rate"]},
            patient_id=resolved_pid
        )

        return ApiResponse(
            success=True,
            data=result,
            message=f"Follow-up visit {visit_id} updated successfully (Status: {result['visit'].get('status')})"
        )
    except Exception as e:
        logger.error(f"Failed to update follow-up visit {visit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating follow-up visit: {str(e)}"
        )


@router.post("/patients/{patient_id}/follow-ups", response_model=ApiResponse[Dict[str, Any]])
def add_patient_follow_up(
    patient_id: Union[int, str],
    visit_data: Dict[str, Any],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.FOLLOWUP_UPDATE.value))
):
    """Adds a new scheduled follow-up visit to the patient's care continuum."""
    try:
        result = post_discharge_service.add_follow_up_visit(
            patient_id=patient_id,
            visit_data=visit_data,
            db=db
        )

        log_audit_event(
            db=db,
            user=current_user,
            action="FOLLOW_UP_VISIT_CREATED",
            resource="follow_ups",
            details={"new_visit_id": result["visit"].get("id"), "visit_type": result["visit"].get("visit_type")},
            patient_id=patient_id
        )

        return ApiResponse(
            success=True,
            data=result,
            message="New follow-up visit scheduled successfully"
        )
    except Exception as e:
        logger.error(f"Failed to add follow-up visit for patient {patient_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scheduling follow-up visit: {str(e)}"
        )


@router.delete("/patients/{patient_id}/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
@router.delete("/follow-ups/{visit_id}", response_model=ApiResponse[Dict[str, Any]])
def delete_patient_follow_up(
    visit_id: int,
    patient_id: Optional[Union[int, str]] = None,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.FOLLOWUP_UPDATE.value))
):
    """Removes or cancels a scheduled follow-up visit."""
    resolved_pid = patient_id
    if resolved_pid is None and db is not None:
        found_plan = db["post_discharge_care_plans"].find_one({"follow_up_visits.id": visit_id})
        if found_plan:
            resolved_pid = found_plan.get("patient_id")
    if resolved_pid is None:
        resolved_pid = 1

    try:
        result = post_discharge_service.delete_follow_up_visit(
            patient_id=resolved_pid,
            visit_id=visit_id,
            db=db
        )

        log_audit_event(
            db=db,
            user=current_user,
            action="FOLLOW_UP_VISIT_DELETED",
            resource="follow_ups",
            details={"deleted_visit_id": visit_id},
            patient_id=resolved_pid
        )

        return ApiResponse(
            success=True,
            data=result,
            message=f"Follow-up visit {visit_id} removed successfully"
        )
    except Exception as e:
        logger.error(f"Failed to delete follow-up visit {visit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing follow-up visit: {str(e)}"
        )


@router.get("/patients/{patient_id}/medication-supply", response_model=ApiResponse[List[MedicationSupplyItem]])
def get_patient_medication_supply(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns post-discharge medication supply and adherence status."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=[MedicationSupplyItem(**m) for m in plan.get("medication_supplies", [])],
        message="Medication supply continuity retrieved"
    )


@router.get("/patients/{patient_id}/nutrition-plan", response_model=ApiResponse[NutritionPlanSchema])
def get_patient_nutrition_plan(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.NUTRITION_VIEW.value))
):
    """Returns assigned dietician medical nutrition therapy plan."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=NutritionPlanSchema(**plan.get("nutrition_plan")),
        message="Nutrition plan retrieved"
    )


@router.post("/post-discharge/nutrition-plan", response_model=ApiResponse[Dict[str, Any]])
def update_nutrition_plan_mutation(
    payload: Dict[str, Any],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.NUTRITION_UPDATE.value))
):
    """Dietician clinical action: Updates glycemic targets, carb limits, and diet plans."""
    pid = payload.get("patient_id", 1)
    db["post_discharge_care_plans"].update_one(
        {"patient_id": pid},
        {"$set": {"nutrition_plan": payload, "updated_at": datetime.datetime.utcnow().isoformat()}},
        upsert=True
    )
    log_audit_event(
        db=db,
        user=current_user,
        action="NUTRITION_PLAN_UPDATED",
        resource="post_discharge",
        patient_id=pid,
        details={"dietician": current_user.full_name}
    )
    return ApiResponse(success=True, data=payload, message="Medical Nutrition Therapy plan updated successfully.")


@router.get("/patients/{patient_id}/rehabilitation", response_model=ApiResponse[RehabilitationPlanSchema])
def get_patient_rehabilitation(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REHABILITATION_VIEW.value))
):
    """Returns physical/occupational rehabilitation regimen and session history."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=RehabilitationPlanSchema(**plan.get("rehabilitation_plan")),
        message="Rehabilitation plan retrieved"
    )


@router.post("/post-discharge/rehabilitation", response_model=ApiResponse[Dict[str, Any]])
def update_rehabilitation_plan_mutation(
    payload: Dict[str, Any],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REHABILITATION_UPDATE.value))
):
    """Rehabilitation Specialist clinical action: Updates therapy protocol and milestones."""
    pid = payload.get("patient_id", 1)
    db["post_discharge_care_plans"].update_one(
        {"patient_id": pid},
        {"$set": {"rehabilitation_plan": payload, "updated_at": datetime.datetime.utcnow().isoformat()}},
        upsert=True
    )
    log_audit_event(
        db=db,
        user=current_user,
        action="REHABILITATION_PLAN_UPDATED",
        resource="post_discharge",
        patient_id=pid,
        details={"specialist": current_user.full_name}
    )
    return ApiResponse(success=True, data=payload, message="Rehabilitation regimen and physical therapy protocol updated.")


@router.get("/patients/{patient_id}/coverage", response_model=ApiResponse[PatientCoverageSchema])
def get_patient_coverage(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns insurance coverage details and high-risk emergency support eligibility."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=PatientCoverageSchema(**plan.get("coverage")),
        message="Coverage details retrieved"
    )


@router.post("/patients/{patient_id}/encounters", response_model=ApiResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
def create_patient_encounter(
    patient_id: Union[int, str],
    encounter_data: Dict[str, Any],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.ENCOUNTER_CREATE.value))
):
    """
    Creates a new encounter for an existing patient (Returning Patient / Readmission).
    Preserves longitudinal history without duplicate patient ID registration.
    """
    try:
        result = post_discharge_service.record_readmission_encounter(
            patient_id=patient_id,
            encounter_data=encounter_data,
            db=db
        )

        log_audit_event(
            db=db,
            user=current_user,
            action="NEW_ENCOUNTER_CREATED",
            resource="encounters",
            patient_id=patient_id,
            details=result.get("readmission_event")
        )

        return ApiResponse(
            success=True,
            data=result,
            message=result["message"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating encounter for {patient_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/patients/{patient_id}/readmissions", response_model=ApiResponse[List[ReadmissionEventSchema]])
def get_patient_readmission_history(
    patient_id: Union[int, str],
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns longitudinal readmission event history and 30-day window metrics."""
    plan = post_discharge_service.get_post_discharge_plan(patient_id, db=db)
    return ApiResponse(
        success=True,
        data=[ReadmissionEventSchema(**r) for r in plan.get("readmissions", [])],
        message="Readmission history retrieved"
    )
