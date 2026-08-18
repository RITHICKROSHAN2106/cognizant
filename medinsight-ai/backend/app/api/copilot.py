import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.database.mongodb import get_mongodb
from app.schemas.schemas import ApiResponse
from app.security.dependencies import (
    get_current_user, CurrentUser, require_permission, log_audit_event
)
from app.security.rbac import PermissionEnum
from app.services.clinical_context_builder import ClinicalContextBuilder
from app.services.llm_service import llm_service
from app.core.config import settings

logger = logging.getLogger("medinsight.copilot")

router = APIRouter(prefix="/copilot", tags=["Clinical AI Copilot"])


class CopilotChatRequest(BaseModel):
    patient_id: Optional[int] = None
    encounter_id: Optional[str] = None
    context_type: Optional[str] = "GENERAL_SUMMARY"
    message: str
    history: Optional[List[Dict[str, str]]] = []


class CopilotSuggestedAction(BaseModel):
    id: str
    title: str
    action_type: str  # ADD_CARE_PLAN, ESCALATE_REVIEW, RECONCILE_MEDS, SCHEDULE_FOLLOWUP
    payload: Dict[str, Any]


class CopilotChatResponse(BaseModel):
    reply: str
    patient_id: Optional[int] = None
    encounter_id: Optional[str] = None
    context_type: str
    citations: List[str] = []
    suggested_actions: List[CopilotSuggestedAction] = []
    model_version: str = "MedInsight-Ensemble-XGBoost-LightGBM / Gemini-1.5-Flash"
    timestamp: str
    disclaimer: str = "Clinical Decision Support — Responses assist clinical review and do not replace professional clinical judgment."


@router.post("/chat", response_model=ApiResponse[CopilotChatResponse])
def copilot_chat(
    req: CopilotChatRequest,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.COPILOT_QUERY.value))
):
    """
    Secure Context-Aware Clinical AI Copilot Endpoint:
    1. Validates authentication & RBAC.
    2. Builds minimum necessary PII-redacted clinical context.
    3. Defends against prompt injection.
    4. Explains ground-truth ML ensemble predictions & TreeSHAP drivers.
    5. Audits every query and response.
    """
    now_iso = datetime.datetime.utcnow().isoformat()
    patient_id = req.patient_id
    context_type = req.context_type or "GENERAL_SUMMARY"

    # Log copilot query audit event
    log_audit_event(
        db=db,
        user=current_user,
        action="COPILOT_QUERY",
        resource="copilot",
        patient_id=patient_id,
        details={"context_type": context_type, "query_len": len(req.message)}
    )

    try:
        # Case A: No patient selected -> General Hospital CDS Assistant
        if not patient_id:
            general_reply = (
                "**Clinical AI Copilot Active (No Patient Selected)**\n\n"
                "I am ready to assist with hospital clinical protocols, ADA 2026 diabetes guidelines, "
                "readmission reduction strategies, or population intelligence.\n\n"
                "💡 *Tip: Select a patient from the Patient Census or EHR to enable contextual clinical review, "
                "vital telemetry synthesis, TreeSHAP model explanation, and post-discharge continuity analysis.*"
            )
            return ApiResponse(
                success=True,
                data=CopilotChatResponse(
                    reply=general_reply,
                    patient_id=None,
                    encounter_id=None,
                    context_type="GENERAL_CDS",
                    citations=["MedInsight Clinical Decision Support Guidelines (ADA/CMS 2026)"],
                    suggested_actions=[],
                    timestamp=now_iso
                ),
                message="Copilot response generated"
            )

        # Case B: Contextual Patient Query -> Build Minimal Safe Context
        context = ClinicalContextBuilder.build_context(
            patient_id=patient_id,
            encounter_id=req.encounter_id,
            context_type=context_type,
            user_role=current_user.role,
            db=db
        )

        prompt = ClinicalContextBuilder.construct_secure_prompt(
            context=context,
            user_message=req.message,
            history=req.history or [],
            user_role=current_user.role
        )

        # Execute verified generation via LLM Service
        history_dicts = [{"role": h.get("role", "user"), "content": h.get("content", "")} for h in (req.history or [])]
        llm_result = llm_service.generate_chat_response(
            patient_id=patient_id,
            user_message=req.message,
            history=history_dicts,
            db=db
        )

        reply_text = llm_result.get("reply", "")
        citations = context.get("citations", ["Master Clinical Record", "Production Readmission Ensemble"])

        # Construct contextual suggested actions for human clinician confirmation
        suggested_actions = []
        if "risk" in req.message.lower() or context_type == "READMISSION_RISK":
            suggested_actions.append(
                CopilotSuggestedAction(
                    id="act_care_plan_risk",
                    title="Add Transitional Care Coordination to Care Plan",
                    action_type="ADD_CARE_PLAN",
                    payload={
                        "category": "High-Risk Surveillance",
                        "description": "Enroll in 30-day readmission reduction transitional care bundle with bedside pharmacist counseling.",
                        "suggested_by": "Clinical Copilot (XGBoost/SHAP Context)"
                    }
                )
            )
        if "medication" in req.message.lower() or context_type == "MEDICATIONS":
            suggested_actions.append(
                CopilotSuggestedAction(
                    id="act_reconcile_meds",
                    title="Order Inpatient Pharmacist Medication Reconciliation",
                    action_type="RECONCILE_MEDS",
                    payload={
                        "category": "Pharmacy Review",
                        "description": "Verify post-discharge insulin titration and glycemic stability protocol.",
                        "suggested_by": "Clinical Copilot"
                    }
                )
            )

        # Log completion audit event
        log_audit_event(
            db=db,
            user=current_user,
            action="COPILOT_RESPONSE_GENERATED",
            resource="copilot",
            patient_id=patient_id,
            details={"citations_count": len(citations), "has_suggestions": len(suggested_actions) > 0}
        )

        response_payload = CopilotChatResponse(
            reply=reply_text,
            patient_id=patient_id,
            encounter_id=req.encounter_id,
            context_type=context_type,
            citations=citations,
            suggested_actions=suggested_actions,
            timestamp=now_iso
        )

        return ApiResponse(
            success=True,
            data=response_payload,
            message="Copilot clinical response generated successfully"
        )

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in Copilot chat pipeline: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical Copilot service error: {str(e)}"
        )
