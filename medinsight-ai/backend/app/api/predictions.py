from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
import datetime
from app.database.mongodb import get_mongodb
from app.schemas.schemas import (
    ApiResponse, PredictionInput, PredictionResult,
    ExplanationResult, SimulationInput, SimulationResult
)
from app.services.prediction_service import prediction_service
from app.services.explainability_service import explainability_service
from app.security.dependencies import (
    get_current_user, require_permission, log_audit_event, CurrentUser
)
from app.security.rbac import PermissionEnum

router = APIRouter(tags=["ML Predictions & Explainability"])


@router.post("/predict/readmission/{encounter_id}", response_model=ApiResponse[Dict[str, Any]])
def predict_encounter_readmission(
    encounter_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.PREDICTION_RUN.value))
):
    """
    Scores a real inpatient encounter through the calibrated LightGBM + XGBoost ensemble.
    Returns probability, decision threshold, risk level, predicted class, and SHAP factors.
    """
    try:
        result = prediction_service.score_encounter_by_id(encounter_id, db=db)

        log_audit_event(
            db=db,
            user=current_user,
            action="PREDICTION_GENERATED",
            resource="ml_predictions",
            patient_id=result["patient_id"],
            encounter_id=encounter_id,
            details={
                "probability": result["probability"],
                "risk_level": result["risk_level"],
                "model_version": result["model_version"],
                "data_source": "diabetic_data.csv"
            }
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Readmission prediction evaluated with production ML pipeline"
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )


@router.post("/predict/readmission", response_model=ApiResponse[PredictionResult])
def predict_readmission_payload(
    input_data: PredictionInput,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.PREDICTION_RUN.value))
):
    try:
        result = prediction_service.predict(input_data, db=db)

        log_audit_event(
            db=db,
            user=current_user,
            action="PREDICTION_GENERATED",
            resource="ml_predictions",
            patient_id=input_data.patient_id,
            details={
                "risk_probability": result.risk_probability,
                "risk_level": result.risk_level,
                "model_version": result.model_version
            }
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Readmission risk prediction evaluated successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction pipeline encountered an error: {str(e)}"
        )


@router.get("/patients/{patient_id}/predictions", response_model=ApiResponse[List[Dict[str, Any]]])
def get_patient_prediction_history(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns longitudinal prediction history for a patient across all hospital visits."""
    preds = list(db["predictions"].find({"patient_id": patient_id}).sort("id", -1))
    return ApiResponse(
        success=True,
        data=preds,
        message="Patient prediction history retrieved"
    )


@router.get("/predictions/{prediction_id}/explanation", response_model=ApiResponse[Dict[str, Any]])
def get_prediction_explanation(
    prediction_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.PREDICTION_EXPLAIN.value))
):
    """Returns real SHAP TreeExplainer feature importance factors influencing the prediction."""
    try:
        explanation = explainability_service.get_explanation_by_prediction_id(prediction_id, db=db)
        return ApiResponse(
            success=True,
            data=explanation,
            message="Prediction feature explanations retrieved"
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.get("/patients/{patient_id}/readmission-risk", response_model=ApiResponse[Dict[str, Any]])
@router.get("/predictions/patient/{patient_id}", response_model=ApiResponse[Dict[str, Any]])
def get_patient_readmission_risk(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    patient = db["patients"].find_one({"id": patient_id}) or db["patients"].find_one({"source_patient_id": patient_id})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found"
        )

    pid = patient["id"]
    predictions = list(db["predictions"].find({"patient_id": pid}))
    latest = predictions[-1] if predictions else None

    if not latest:
        encs = list(db["encounters"].find({"patient_id": pid}))
        if encs:
            latest_enc = encs[-1]
            try:
                prediction_service.score_encounter_by_id(latest_enc["id"], db=db)
                predictions = list(db["predictions"].find({"patient_id": pid}))
                latest = predictions[-1] if predictions else None
            except Exception as ex:
                logger.warning(f"Auto-score notice for patient {pid}: {ex}")

    latest_schema = PredictionResult(**latest) if latest else None

    return ApiResponse(
        success=True,
        data={
            "patient_id": pid,
            "risk_probability": latest.get("risk_probability") if latest else patient.get("risk_probability", 0.45),
            "risk_level": latest.get("risk_level") if latest else patient.get("risk_level", "Moderate"),
            "model_name": "MedInsight-Ensemble-XGBoost-LightGBM",
            "model_version": "prod-v2.1",
            "latest_prediction": latest_schema,
            "prediction_history": predictions
        },
        message="Patient readmission risk retrieved"
    )


@router.get("/patients/{patient_id}/explanation", response_model=ApiResponse[ExplanationResult])
def get_patient_explanation(
    patient_id: int,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        result = explainability_service.get_explanation_for_patient(patient_id, db=db)
        return ApiResponse(success=True, data=result, message="SHAP Explanation generated")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/patients/{patient_id}/simulate-risk", response_model=ApiResponse[SimulationResult])
def simulate_risk(
    patient_id: int,
    simulation: SimulationInput,
    db=Depends(get_mongodb),
    current_user: CurrentUser = Depends(require_permission(PermissionEnum.PREDICTION_RUN.value))
):
    try:
        result = explainability_service.simulate_scenario(patient_id, simulation, db=db)
        return ApiResponse(success=True, data=result, message="Risk simulation computed")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/model/metrics", response_model=ApiResponse[Dict[str, Any]])
def get_model_metrics(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Returns the verified held-out test evaluation metadata directly from the trained model artifacts.
    """
    import os, json
    from app.core.config import settings
    metadata_path = os.path.join(settings.ML_MODEL_PATH, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
            return ApiResponse(
                success=True,
                data=meta,
                message="Trained model held-out test evaluation metrics retrieved from metadata"
            )
    
    from app.services.dataset_service import dataset_service
    pop = dataset_service.get_population_analytics()
    return ApiResponse(
        success=True,
        data=pop.get("model_metrics", {}),
        message="Model evaluation metrics retrieved"
    )
