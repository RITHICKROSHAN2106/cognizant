import logging
from typing import Dict, Any, List, Optional
from app.schemas.schemas import ExplanationResult, ExplanationFeature, SimulationInput, SimulationResult
from app.ml.model_loader import get_model

logger = logging.getLogger("medinsight.xai")


class ExplainabilityService:

    @classmethod
    def get_explanation_for_patient(
        cls,
        patient_id: int,
        db
    ) -> ExplanationResult:
        patient = db["patients"].find_one({"$or": [{"id": patient_id}, {"source_patient_id": patient_id}, {"patient_nbr": patient_id}]})
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found")

        resolved_pid = patient.get("id") or patient.get("source_patient_id") or patient_id

        # Get latest encounter
        encounters = list(db["encounters"].find({"$or": [{"patient_id": resolved_pid}, {"source_patient_id": resolved_pid}]}))
        current_enc = encounters[-1] if encounters else {}

        model = get_model()
        score_res = model.score_encounter(current_enc, patient) if current_enc else None

        # Look for saved explanations
        exps = list(db["prediction_explanations"].find({"$or": [{"patient_id": resolved_pid}, {"patient_id": patient_id}]}))
        if exps:
            features = [
                ExplanationFeature(
                    feature=e.get("feature_name", e.get("raw_feature_name")),
                    value=str(e.get("feature_value", "")),
                    contribution=float(e.get("contribution", 0.0)),
                    direction=e.get("direction", "increases_risk")
                )
                for e in exps
            ]
        else:
            # Generate real-time SHAP explanation from trained model
            raw_factors = model.explain_encounter(current_enc, patient) if current_enc else []
            features = [
                ExplanationFeature(
                    feature=f["feature"],
                    value=str(f.get("importance_pct", 10)) + "%",
                    contribution=f["contribution"],
                    direction=f["direction"]
                )
                for f in raw_factors
            ]

        prob = patient.get("risk_probability")
        risk_lvl = patient.get("risk_level")
        if prob is None and score_res:
            prob = score_res["probability"]
            risk_lvl = score_res["risk_level"]
        elif prob is None:
            prob = 0.05
            risk_lvl = "Low"

        return ExplanationResult(
            patient_id=patient_id,
            encounter_id=str(current_enc.get("encounter_id", f"ENC-{resolved_pid}")),
            prediction=prob,
            risk_level=risk_lvl or "Low",
            baseline_risk=0.05,
            features=features
        )

    @classmethod
    def get_explanation_by_prediction_id(
        cls,
        prediction_id: int,
        db
    ) -> Dict[str, Any]:
        pred = db["predictions"].find_one({"id": prediction_id})
        if not pred:
            raise ValueError(f"Prediction {prediction_id} not found")

        exps = list(db["prediction_explanations"].find({"prediction_id": prediction_id}))
        patient_id = pred.get("patient_id")
        patient = db["patients"].find_one({"$or": [{"id": patient_id}, {"source_patient_id": patient_id}]}) if patient_id else {}

        factors = [
            {
                "feature": e.get("feature_name"),
                "value": e.get("feature_value"),
                "contribution": e.get("contribution"),
                "direction": e.get("direction"),
                "importance_pct": e.get("importance_pct", 10.0)
            }
            for e in exps
        ]

        return {
            "prediction_id": prediction_id,
            "patient_id": patient_id,
            "probability": pred.get("probability", pred.get("risk_probability", 0.05)),
            "risk_level": pred.get("risk_level", "Low"),
            "model_version": pred.get("model_version", "prod-v2.1"),
            "title": "Factors Influencing This Prediction",
            "factors": factors,
            "disclaimer": "Clinical Decision Support feature contribution analysis based on TreeExplainer SHAP values. Feature importance indicates statistical model weighting and does not establish clinical etiology or causation."
        }

    @classmethod
    def simulate_scenario(
        cls,
        patient_id: int,
        simulation: SimulationInput,
        db
    ) -> SimulationResult:
        patient = db["patients"].find_one({"$or": [{"id": patient_id}, {"source_patient_id": patient_id}, {"patient_nbr": patient_id}]})
        resolved_pid = patient.get("id") or patient.get("source_patient_id") or patient_id if patient else patient_id
        
        baseline = None
        if patient:
            baseline = patient.get("risk_probability")
        if baseline is None:
            encounters = list(db["encounters"].find({"$or": [{"patient_id": resolved_pid}, {"source_patient_id": resolved_pid}]}))
            current_enc = encounters[-1] if encounters else {}
            if current_enc and patient:
                model = get_model()
                score_res = model.score_encounter(current_enc, patient)
                baseline = score_res["probability"]
            else:
                baseline = 0.05

        reduction = 0.0
        applied = []

        if simulation.medication_reconciliation:
            reduction += 0.015
            applied.append("Medication Reconciliation at Discharge")

        if simulation.follow_up_scheduled:
            reduction += 0.020
            applied.append("7-Day Post-Discharge Clinical Follow-up")

        if simulation.diabetes_education:
            reduction += 0.010
            applied.append("Certified Diabetes Educator Consultation")

        if simulation.care_coordinator:
            reduction += 0.015
            applied.append("Assigned Dedicated Nurse Care Coordinator")

        if simulation.early_outpatient_review:
            reduction += 0.010
            applied.append("Early Outpatient Primary Care Review")

        if simulation.home_monitoring:
            reduction += 0.012
            applied.append("Remote Glucose & Vitals Home Monitoring")

        scenario_risk = max(0.01, round(baseline - reduction, 4))
        difference = round(scenario_risk - baseline, 4)

        return SimulationResult(
            patient_id=patient_id,
            baselineRisk=round(baseline, 4),
            scenarioRisk=round(scenario_risk, 4),
            difference=difference,
            appliedInterventions=applied
        )

    @classmethod
    def get_patient_explanation(cls, patient_id: int, db: Any) -> Any:
        return cls.get_explanation_for_patient(patient_id, db)


explainability_service = ExplainabilityService()
