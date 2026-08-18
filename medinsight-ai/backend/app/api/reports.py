import io
import re
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from app.database.mongodb import get_mongodb
from app.schemas.schemas import ApiResponse, ReportSummaryResponse
from app.security.dependencies import (
    get_current_user, CurrentUser, require_permission, log_audit_event
)
from app.security.rbac import PermissionEnum
from app.services.report_service import report_service

router = APIRouter(prefix="/patients", tags=["Patient Reports"])


def make_clean_report_filename(mrn: str, report_type: str, ext: str) -> str:
    date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    type_name = "Discharge_Summary" if report_type in ["discharge", "discharge-summary"] else "Clinical_Report"
    clean_mrn = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(mrn or "Patient"))
    return f"{clean_mrn}_{type_name}_{date_str}.{ext}"


@router.get("/{patient_id}/report", response_model=ApiResponse[ReportSummaryResponse])
def get_patient_report_data(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REPORTS_VIEW.value))
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating patient report: {str(e)}"
        )


@router.get("/{patient_id}/report/pdf")
def export_patient_report_pdf(
    patient_id: int,
    report_type: str = "discharge",
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REPORTS_EXPORT.value))
):
    """Generate and stream high-quality clinical summary PDF report with meaningful filename."""
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
        action="REPORT_PDF_EXPORTED",
        resource="reports_pdf",
        patient_id=patient_id
    )

    try:
        pdf_bytes = report_service.generate_pdf(patient_id, db, report_type=report_type)
        mrn = patient.get('mrn', f'MRN-{patient_id}')
        filename = make_clean_report_filename(mrn, report_type, "pdf")
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling PDF report: {str(e)}"
        )


@router.get("/{patient_id}/report/csv")
def export_patient_report_csv(
    patient_id: int,
    report_type: str = "discharge",
    encounter_id: Optional[str] = None,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REPORTS_EXPORT.value))
):
    """Generate and stream structured clinical summary CSV report with meaningful filename."""
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
        action="REPORT_CSV_EXPORTED",
        resource="reports_csv",
        patient_id=patient_id
    )

    try:
        csv_content = report_service.generate_patient_csv(
            patient_id=patient_id,
            db=db,
            encounter_id=encounter_id,
            report_type=report_type
        )
        mrn = patient.get('mrn', f'MRN-{patient_id}')
        filename = make_clean_report_filename(mrn, report_type, "csv")
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling CSV report: {str(e)}"
        )


@router.get("/cohort/csv")
def export_cohort_csv(
    search: str = None,
    risk_level: str = None,
    readmission_status: str = None,
    limit: int = 10000,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REPORTS_EXPORT.value))
):
    """
    Exports full patient census and readmission risk details as structured CSV.
    """
    log_audit_event(
        db=db,
        user=current_user,
        action="COHORT_REPORT_CSV_DOWNLOADED",
        resource="reports_csv"
    )
    csv_content = report_service.generate_cohort_csv(
        db=db,
        search=search,
        risk_level=risk_level,
        readmission_status=readmission_status,
        limit=limit
    )
    date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"MedInsight_Patient_Risk_Cohort_Registry_{date_str}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/cohort/pdf")
def export_cohort_pdf(
    search: str = None,
    risk_level: str = None,
    limit: int = 150,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.REPORTS_EXPORT.value))
):
    """
    Generates and streams formatted multi-page PDF master registry with executive KPIs and patient risk details.
    """
    log_audit_event(
        db=db,
        user=current_user,
        action="COHORT_REPORT_PDF_DOWNLOADED",
        resource="reports_pdf"
    )
    try:
        pdf_bytes = report_service.generate_cohort_pdf(
            db=db,
            search=search,
            risk_level=risk_level,
            limit=limit
        )
        date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        filename = f"MedInsight_Patient_Risk_Cohort_Report_{date_str}.pdf"
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling Cohort PDF report: {str(e)}"
        )


# Dedicated Enterprise / Encounter Reports Router
reports_router = APIRouter(prefix="/reports", tags=["Clinical & Cohort Reports"])


@reports_router.get("/patients/{patient_id}/encounters/{encounter_id}/discharge-summary.pdf")
def export_encounter_discharge_summary_pdf(
    patient_id: int,
    encounter_id: str,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Specific encounter discharge summary PDF export with strict patient & encounter validation."""
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        from app.services.dataset_service import dataset_service
        patient = dataset_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {patient_id} not found.")

    return export_patient_report_pdf(patient_id, "discharge", db, current_user)


@reports_router.get("/patients/{patient_id}/encounters/{encounter_id}/discharge-summary.csv")
def export_encounter_discharge_summary_csv(
    patient_id: int,
    encounter_id: str,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Specific encounter discharge summary CSV export with strict patient & encounter validation."""
    patient = db["patients"].find_one({"id": patient_id})
    if not patient:
        from app.services.dataset_service import dataset_service
        patient = dataset_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {patient_id} not found.")

    return export_patient_report_csv(patient_id, "discharge", encounter_id, db, current_user)


@reports_router.get("/patients/{patient_id}/report/pdf")
def export_patient_report_pdf_alias(
    patient_id: int,
    report_type: str = "discharge",
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    return export_patient_report_pdf(patient_id, report_type, db, current_user)


@reports_router.get("/patients/{patient_id}/report/csv")
def export_patient_report_csv_alias(
    patient_id: int,
    report_type: str = "discharge",
    encounter_id: Optional[str] = None,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    return export_patient_report_csv(patient_id, report_type, encounter_id, db, current_user)


@reports_router.get("/cohort/csv")
def export_cohort_csv_alias(
    search: str = None,
    risk_level: str = None,
    readmission_status: str = None,
    limit: int = 10000,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    return export_cohort_csv(search, risk_level, readmission_status, limit, db, current_user)


@reports_router.get("/cohort/pdf")
def export_cohort_pdf_alias(
    search: str = None,
    risk_level: str = None,
    limit: int = 150,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    return export_cohort_pdf(search, risk_level, limit, db, current_user)
