import datetime
import logging
from typing import Dict, Any, Optional, List
from app.schemas.schemas import PredictionInput, PredictionResult
from app.ml.model_loader import get_model, TrainedEnsembleModel

logger = logging.getLogger("medinsight.prediction")


class PredictionService:

    @classmethod
    def score_encounter_by_id(cls, encounter_id: int, db: Any) -> Dict[str, Any]:
        """
        Scores a real hospital encounter using the production trained model pipeline.
        Saves the resulting prediction to the database.
        """
        enc = db["encounters"].find_one({"id": encounter_id})
        if not enc:
            # Fallback search by encounter_id string or raw id
            enc = db["encounters"].find_one({"encounter_id": encounter_id})
        if not enc:
            raise ValueError(f"Encounter {encounter_id} not found in database.")

        patient_id = enc.get("patient_id", 1)
        patient = db["patients"].find_one({"id": patient_id})

        # Load production model
        model = get_model()
        score_res = model.score_encounter(enc, patient)

        # Generate real SHAP explanations
        factors = model.explain_encounter(enc, patient)

        # Store in predictions collection
        all_preds = list(db["predictions"].find())
        max_id = max([p.get("id", 0) for p in all_preds], default=0)
        pred_id = max_id + 1

        prediction_doc = {
            "id": pred_id,
            "patient_id": patient_id,
            "encounter_id": enc.get("id", encounter_id),
            "encounter_identifier": str(enc.get("encounter_id", encounter_id)),
            "probability": score_res["probability"],
            "risk_probability": score_res["probability"],
            "decision_threshold": score_res["decision_threshold"],
            "predicted_class": score_res["predicted_class"],
            "risk_level": score_res["risk_level"],
            "model_name": score_res["model_name"],
            "model_version": score_res["model_version"],
            "is_demo": False,
            "data_source": "diabetic_data.csv",
            "actual_outcome": enc.get("readmitted_outcome", "NO"),
            "input_features": score_res["feature_dict"],
            "prediction_timestamp": datetime.datetime.utcnow().isoformat()
        }
        db["predictions"].insert_one(prediction_doc)

        # Store explanations
        all_exps = list(db["prediction_explanations"].find())
        max_exp_id = max([e.get("id", 0) for e in all_exps], default=0)

        for idx, f in enumerate(factors, start=1):
            exp_doc = {
                "id": max_exp_id + idx,
                "prediction_id": pred_id,
                "patient_id": patient_id,
                "feature_name": f["feature"],
                "raw_feature_name": f.get("raw_feature_name", f["feature"]),
                "feature_value": str(score_res["feature_dict"].get(f.get("raw_feature_name"), "")),
                "contribution": f["contribution"],
                "direction": f["direction"],
                "importance_pct": f.get("importance_pct", 10.0),
                "created_at": datetime.datetime.utcnow().isoformat()
            }
            db["prediction_explanations"].insert_one(exp_doc)

        # Update patient risk score in database
        db["patients"].update_one(
            {"id": patient_id},
            {"$set": {
                "risk_probability": score_res["probability"],
                "risk_level": score_res["risk_level"]
            }}
        )

        return {
            "prediction_id": pred_id,
            "patient_id": patient_id,
            "encounter_id": enc.get("id", encounter_id),
            "probability": score_res["probability"],
            "predicted_class": score_res["predicted_class"],
            "risk_level": score_res["risk_level"],
            "decision_threshold": score_res["decision_threshold"],
            "model_version": score_res["model_version"],
            "data_source": "diabetic_data.csv",
            "actual_outcome": enc.get("readmitted_outcome", "NO"),
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "factors": factors
        }

    @classmethod
    def predict(cls, input_data: PredictionInput, db: Optional[Any] = None) -> PredictionResult:
        model = get_model()
        features_dict = input_data.model_dump()
        score_res = model.score_encounter(features_dict)

        prob = score_res["probability"]
        risk_level = score_res["risk_level"]
        threshold = score_res["decision_threshold"]

        result = PredictionResult(
            patient_id=input_data.patient_id,
            encounter_id=input_data.encounter_id,
            risk_probability=prob,
            risk_level=risk_level,
            threshold=threshold,
            model_name=score_res["model_name"],
            model_version=score_res["model_version"],
            is_demo=False,
            prediction_timestamp=datetime.datetime.utcnow().isoformat(),
            input_features=features_dict,
            confidence_interval=[max(0.0, round(prob - 0.04, 3)), min(1.0, round(prob + 0.04, 3))]
        )

        if db is not None and input_data.patient_id:
            try:
                db["patients"].update_one(
                    {"id": input_data.patient_id},
                    {"$set": {"risk_probability": prob, "risk_level": risk_level}}
                )
            except Exception:
                pass

        return result

    @classmethod
    def predict_encounter_by_id(cls, encounter_id: int, db: Any) -> Dict[str, Any]:
        return cls.score_encounter_by_id(encounter_id, db)


prediction_service = PredictionService()

