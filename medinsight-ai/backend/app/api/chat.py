from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.database.mongodb import get_mongodb
from app.schemas.schemas import ChatRequest, ChatResponse, ApiResponse
from app.security.dependencies import get_current_user, CurrentUser, log_audit_event
from app.services.llm_service import llm_service

router = APIRouter(prefix="/patients", tags=["Patient AI Chat"])


@router.post("/{patient_id}/chat", response_model=ApiResponse[ChatResponse])
def chat_with_patient_ai(
    patient_id: int,
    request: ChatRequest,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Patient-Specific AI Chatbot:
    Answers user questions strictly bounded to Patient {patient_id}'s authorized medical records.
    Prevents cross-patient information leakage and provides clinical decision support.
    """
    # Verify patient exists
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient record with ID {patient_id} not found."
        )

    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_AI_CHAT_QUERY",
        resource="llm_chat",
        patient_id=patient_id,
        details={"query_length": len(request.message)}
    )

    try:
        history_dicts = [{"role": h.role, "content": h.content} for h in (request.history or [])]
        response_dict = llm_service.generate_chat_response(
            patient_id=patient_id,
            user_message=request.message,
            history=history_dicts,
            db=db
        )

        chat_resp = ChatResponse(
            patient_id=patient_id,
            reply=response_dict["reply"],
            model=response_dict["model"],
            timestamp=response_dict["timestamp"],
            disclaimer=response_dict["disclaimer"]
        )

        # Store in chat history
        db["chat_history"].insert_one({
            "patient_id": patient_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "user_message": request.message,
            "ai_reply": response_dict["reply"],
            "timestamp": response_dict["timestamp"]
        })

        return ApiResponse(
            success=True,
            data=chat_resp,
            message="Patient AI response generated successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating AI response: {str(e)}"
        )
