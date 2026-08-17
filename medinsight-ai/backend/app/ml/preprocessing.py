import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List


FEATURE_ORDER = [
    "time_in_hospital",
    "num_lab_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "a1c_high",
    "a1c_normal",
    "insulin_up",
    "insulin_down",
    "insulin_steady",
    "previous_readmissions"
]


def preprocess_patient_features(raw_features: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Transforms raw prediction features into normalized numeric vector
    and structured dictionary for explainability.
    """
    time_in_hospital = float(raw_features.get("time_in_hospital", 3))
    num_labs = float(raw_features.get("num_lab_procedures", 15))
    num_meds = float(raw_features.get("num_medications", 8))
    num_outpatient = float(raw_features.get("number_outpatient", 0))
    num_emergency = float(raw_features.get("number_emergency", 0))
    num_inpatient = float(raw_features.get("number_inpatient", 0))
    prev_readmit = float(raw_features.get("previous_readmissions", 0))

    a1c = str(raw_features.get("A1Cresult", "none")).lower()
    a1c_high = 1.0 if a1c == "high" else 0.0
    a1c_normal = 1.0 if a1c == "normal" else 0.0

    insulin = str(raw_features.get("insulin", "none")).lower()
    insulin_up = 1.0 if insulin == "up" else 0.0
    insulin_down = 1.0 if insulin == "down" else 0.0
    insulin_steady = 1.0 if insulin == "steady" else 0.0

    feature_dict = {
        "time_in_hospital": time_in_hospital,
        "num_lab_procedures": num_labs,
        "num_medications": num_meds,
        "number_outpatient": num_outpatient,
        "number_emergency": num_emergency,
        "number_inpatient": num_inpatient,
        "a1c_high": a1c_high,
        "a1c_normal": a1c_normal,
        "insulin_up": insulin_up,
        "insulin_down": insulin_down,
        "insulin_steady": insulin_steady,
        "previous_readmissions": prev_readmit
    }

    feature_vector = np.array([[feature_dict[col] for col in FEATURE_ORDER]], dtype=np.float32)
    return feature_vector, feature_dict
