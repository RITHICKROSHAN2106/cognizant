from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
import datetime
from app.database.mongodb import get_mongodb
from app.schemas.schemas import (
    ApiResponse, RecommendationSchema, DischargePlanSchema, DischargePlanUpdate
)
from app.security.dependencies import get_current_user, log_audit_event, CurrentUser

router = APIRouter(tags=["Personalized Prevention & Discharge Planning"])


@router.patch("/recommendations/{rec_id}/toggle", response_model=ApiResponse[RecommendationSchema])
def toggle_recommendation(
    rec_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    rec = db["recommendations"].find_one({"id": rec_id})
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    new_is_completed = not rec.get("is_completed", False)
    new_status = "Completed" if new_is_completed else "Pending"

    db["recommendations"].update_one(
        {"id": rec_id},
        {"$set": {"is_completed": new_is_completed, "status": new_status}}
    )
    updated_rec = db["recommendations"].find_one({"id": rec_id})

    log_audit_event(
        db=db,
        user=current_user,
        action="RECOMMENDATION_STATUS_TOGGLED",
        resource="recommendations",
        patient_id=rec.get("patient_id"),
        details={"rec_id": rec_id, "status": new_status}
    )
    return ApiResponse(
        success=True,
        data=RecommendationSchema(**updated_rec),
        message=f"Recommendation marked as {new_status}"
    )
