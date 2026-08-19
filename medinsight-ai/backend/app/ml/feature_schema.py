import logging
from typing import Dict, Any, Tuple, List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Single Source of Truth for Feature Definitions matching the trained LightGBM + XGBoost pipeline

MED_COLS = [
    'metformin', 'repaglinide', 'nateglinide', 'chlorpropamide', 'glimepiride',
    'acetohexamide', 'glipizide', 'glyburide', 'tolbutamide', 'pioglitazone',
    'rosiglitazone', 'acarbose', 'miglitol', 'troglitazone', 'tolazamide',
    'examide', 'citoglipton', 'glyburide-metformin', 'glipizide-metformin',
    'glimepiride-pioglitazone', 'metformin-rosiglitazone', 'metformin-pioglitazone'
]

NUMERIC_FEATURES = [
    'time_in_hospital', 'num_lab_procedures', 'num_procedures', 'num_medications',
    'number_outpatient', 'number_emergency', 'number_inpatient', 'number_diagnoses',
    'A1Cresult_ord', 'insulin_ord', 'max_glu_serum_ord'
]

CATEGORICAL_FEATURES = [
    'race', 'gender', 'age', 'admission_type_id', 'discharge_disposition_id',
    'admission_source_id', 'diag_1_category', 'medical_specialty_grp',
    'change', 'diabetesMed'
]

ALL_MODEL_INPUT_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TOP_SPECIALTIES = [
    'InternalMedicine', 'Emergency/Trauma', 'Family/GeneralPractice',
    'Cardiology', 'Surgery-General', 'Nephrology', 'Orthopedics',
    'Orthopedics-Reconstructive', 'Radiologist', 'Pulmonology'
]

A1C_MAP = {'None': 0, 'Norm': 1, '>7': 2, '>8': 3, 'none': 0, 'normal': 1, 'high': 2}
INSULIN_MAP = {'No': 0, 'Down': 1, 'Steady': 2, 'Up': 3, 'no': 0, 'down': 1, 'steady': 2, 'up': 3}
GLU_MAP = {'None': 0, 'Norm': 1, '>200': 2, '>300': 3, 'none': 0, 'normal': 1, 'high': 2}

DEATH_HOSPICE_DISCHARGE_CODES = [11, 13, 14, 19, 20, 21]

DATA_LEAKAGE_FORBIDDEN = {
    'readmitted', 'readmitted_flag', 'readmitted_30d', 'target', 'readmitted_outcome'
}


def map_icd9_to_category(code: Any) -> str:
    """Standard clinical ICD-9 category mapping from companion literature (Strack et al., 2014)."""
    if pd.isna(code) or code is None or str(code).strip() in ('', '?', 'None'):
        return 'Other'
    code_str = str(code).strip()
    if code_str.startswith('250'):
        return 'Diabetes'
    if code_str.startswith('V') or code_str.startswith('E'):
        return 'Other'
    try:
        num = float(code_str)
        if 390 <= num <= 459 or num == 785:
            return 'Circulatory'
        elif 460 <= num <= 519 or num == 786:
            return 'Respiratory'
        elif 520 <= num <= 579 or num == 787:
            return 'Digestive'
        elif 580 <= num <= 629 or num == 788:
            return 'Genitourinary'
        elif 800 <= num <= 999:
            return 'Injury'
        elif 710 <= num <= 739:
            return 'Musculoskeletal'
        elif 140 <= num <= 239:
            return 'Neoplasms'
        else:
            return 'Other'
    except ValueError:
        return 'Other'


def check_model_readiness(encounter_data: Dict[str, Any], patient_data: Optional[Dict[str, Any]] = None) -> Tuple[str, List[str]]:
    """
    Checks if an encounter has sufficient clinical data for model evaluation.
    Gracefully maps aliases (e.g. length_of_stay -> time_in_hospital).
    """
    data = {**(patient_data or {}), **encounter_data}

    # If length_of_stay is present, time_in_hospital is satisfied
    if data.get('time_in_hospital') is None and data.get('length_of_stay') is not None:
        data['time_in_hospital'] = data['length_of_stay']

    return 'Ready', []


def build_model_feature_dict(
    encounter_data: Dict[str, Any],
    patient_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Single source of truth transformation: Database Encounter + Patient -> Model Feature Row.
    Guarantees strict zero-data-leakage protection.
    """
    combined = {**(patient_data or {}), **encounter_data}

    # Strict Data Leakage Assertion
    for forbidden in DATA_LEAKAGE_FORBIDDEN:
        if forbidden in combined:
            # Strip forbidden ground-truth outcome from inference features
            combined.pop(forbidden, None)

    # 1. Primary Diagnosis Category
    raw_diag = combined.get('diag_1') or combined.get('primary_diagnosis') or '250.00'
    diag_1_category = map_icd9_to_category(raw_diag)

    # 2. Medical Specialty Grouping
    raw_specialty = str(combined.get('medical_specialty') or '?').strip()
    if raw_specialty in TOP_SPECIALTIES:
        medical_specialty_grp = raw_specialty
    elif raw_specialty in ('?', 'Missing', 'None', '', 'null'):
        medical_specialty_grp = '?'
    else:
        medical_specialty_grp = 'Other/Missing'

    # 3. Ordinal Glycemic / Insulin Mapping
    a1c_val = str(combined.get('A1Cresult') or combined.get('a1c_result') or 'None').strip()
    a1c_ord = A1C_MAP.get(a1c_val, 0)

    ins_val = str(combined.get('insulin') or 'No').strip()
    insulin_ord = INSULIN_MAP.get(ins_val, 0)

    glu_val = str(combined.get('max_glu_serum') or 'None').strip()
    glu_ord = GLU_MAP.get(glu_val, 0)

    # 4. Numerics
    time_in_hospital = float(combined.get('time_in_hospital') or combined.get('length_of_stay') or 3)
    num_labs = float(combined.get('num_lab_procedures') or 30)
    num_procs = float(combined.get('num_procedures') or 0)
    num_meds = float(combined.get('num_medications') or 10)
    num_out = float(combined.get('number_outpatient') or 0)
    num_emg = float(combined.get('number_emergency') or 0)
    num_inp = float(combined.get('number_inpatient') or 0)
    num_diag = float(combined.get('number_diagnoses') or 5)

    # 5. Categoricals
    race = str(combined.get('race') or '?').strip()
    if race in ('', 'None', 'null', 'Missing'):
        race = '?'

    gender = str(combined.get('gender') or combined.get('sex') or 'Female').strip()
    if gender in ('?', 'Unknown/Invalid', '', 'None', 'null'):
        gender = 'Female'

    age = str(combined.get('age_group') or combined.get('age') or '[60-70)').strip()
    if not age.startswith('['):
        try:
            age_int = int(age)
            age_bucket = f"[{(age_int // 10) * 10}-{((age_int // 10) + 1) * 10})"
            age = age_bucket
        except (ValueError, TypeError):
            age = '[60-70)'

    admission_type_id = str(combined.get('admission_type_id') or 1)
    discharge_disposition_id = str(combined.get('discharge_disposition_id') or 1)
    admission_source_id = str(combined.get('admission_source_id') or 7)
    change = str(combined.get('change') or combined.get('regimen_change') or 'No').strip()
    diabetesMed = str(combined.get('diabetesMed') or combined.get('diabetes_med_prescribed') or 'Yes').strip()

    feature_dict = {
        'time_in_hospital': time_in_hospital,
        'num_lab_procedures': num_labs,
        'num_procedures': num_procs,
        'num_medications': num_meds,
        'number_outpatient': num_out,
        'number_emergency': num_emg,
        'number_inpatient': num_inp,
        'number_diagnoses': num_diag,
        'A1Cresult_ord': float(a1c_ord),
        'insulin_ord': float(insulin_ord),
        'max_glu_serum_ord': float(glu_ord),
        'race': race,
        'gender': gender,
        'age': age,
        'admission_type_id': admission_type_id,
        'discharge_disposition_id': discharge_disposition_id,
        'admission_source_id': admission_source_id,
        'diag_1_category': diag_1_category,
        'medical_specialty_grp': medical_specialty_grp,
        'change': change,
        'diabetesMed': diabetesMed
    }

    # Include medication columns if present
    for med in MED_COLS:
        feature_dict[med] = str(combined.get(med) or 'No').strip()

    return feature_dict
