import io
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from app.database.mongodb import get_mongodb
from app.schemas.schemas import ApiResponse, ReportSummaryResponse
from app.security.dependencies import get_current_user, CurrentUser, log_audit_event
from app.services.report_service import report_service

router = APIRouter(prefix="/patients", tags=["Patient Reports"])


@router.get("/{patient_id}/report", response_model=ApiResponse[ReportSummaryResponse])
def get_patient_report_data(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Retrieve full aggregated clinical report dataset for a patient."""
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        from app.services.dataset_service import dataset_service
        patient = dataset_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient record with ID {patient_id} not found."
        )

    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_REPORT_VIEWED",
        resource="reports",
        patient_id=patient_id
    )

    try:
        report_data = report_service.get_full_report_data(patient_id, db)
        return ApiResponse(
            success=True,
            data=report_data,
            message="Patient clinical report aggregated successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating patient report: {str(e)}"
        )


@router.get("/{patient_id}/report/pdf")
def export_patient_report_pdf(
    patient_id: int,
    report_type: str = "discharge",
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Generate and stream high-quality clinical summary PDF report."""
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        from app.services.dataset_service import dataset_service
        patient = dataset_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient record with ID {patient_id} not found."
        )


    log_audit_event(
        db=db,
        user=current_user,
        action="PATIENT_REPORT_PDF_DOWNLOADED",
        resource="reports_pdf",
        patient_id=patient_id
    )

    try:
        pdf_bytes = report_service.generate_pdf(patient_id, db, report_type=report_type)
        prefix = "Discharge_Summary" if report_type == "discharge" else "Clinical_Report"
        mrn_clean = str(patient.get('mrn', f'P{patient_id}')).replace(" ", "_")
        filename = f"{prefix}_{mrn_clean}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling PDF report: {str(e)}"
        )


