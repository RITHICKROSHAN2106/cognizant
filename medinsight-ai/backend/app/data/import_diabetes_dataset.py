import os
import sys
import logging
import json
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.mongodb import get_db, MongoDBManager
from app.ml.feature_schema import map_icd9_to_category

logger = logging.getLogger("medinsight.etl")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Search locations for diabetic_data.csv
POSSIBLE_PATHS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../diabetic_data.csv")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../diabetic_data.csv")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../diabetic_data.csv")),
    r"C:\Users\HRITIK\Desktop\Frontend\diabetic_data.csv"
]


def find_csv_path() -> str:
    for path in POSSIBLE_PATHS:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"diabetic_data.csv not found in any expected location: {POSSIBLE_PATHS}")


def clean_val(val: Any) -> Any:
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s in ('?', 'None', 'nan', 'NULL', ''):
        return None
    return s


def parse_age(age_str: str) -> int:
    """Converts '[60-70)' into median age integer 65."""
    if not age_str:
        return 65
    clean = str(age_str).replace('[', '').replace(')', '').replace('+', '').strip()
    if '-' in clean:
        parts = clean.split('-')
        try:
            return (int(parts[0]) + int(parts[1])) // 2
        except (ValueError, IndexError):
            return 65
    try:
        return int(clean)
    except ValueError:
        return 65


def import_dataset(limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Imports real patients, longitudinal encounters, diagnoses, medications,
    and laboratory observations from diabetic_data.csv into database.
    """
    csv_path = find_csv_path()
    logger.info(f"Importing diabetes dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    total_raw_rows = len(df)
    logger.info(f"Loaded {total_raw_rows:,} raw encounters from CSV.")

    db = get_db()
    if db is None:
        logger.warning("Database unavailable, skipping ETL.")
        return {"status": "error", "message": "Database unavailable"}

    # Sort by patient_nbr and encounter_id to preserve longitudinal chronology
    df = df.sort_values(by=['patient_nbr', 'encounter_id']).reset_index(drop=True)

    if limit is not None and limit < len(df):
        # Pick patients with multiple encounters to demonstrate longitudinal history
        patient_counts = df['patient_nbr'].value_counts()
        multi_enc_patients = patient_counts[patient_counts >= 2].index.tolist()
        single_enc_patients = patient_counts[patient_counts == 1].index.tolist()
        
        # Take a balanced subset of multi-encounter and single-encounter patients
        selected_patients = set(multi_enc_patients[:100] + single_enc_patients[:200])
        df = df[df['patient_nbr'].isin(selected_patients)].head(limit).copy()
        logger.info(f"Sampling {len(df)} encounters across {df['patient_nbr'].nunique()} patients.")

    patients_collection = db["patients"]
    encounters_collection = db["encounters"]
    diagnoses_collection = db["diagnoses"]
    medications_collection = db["medications"]
    observations_collection = db["observations"]
    clinical_features_collection = db["clinical_features"]

    # Check if already imported
    existing_count = encounters_collection.count_documents({})
    if existing_count > 50:
        logger.info(f"Dataset already imported with {existing_count} encounters. Skipping duplicate import.")
        return {
            "status": "already_imported",
            "encounters_count": existing_count,
            "patients_count": patients_collection.count_documents({})
        }

    imported_patients = {}
    imported_encounters_count = 0
    patient_id_counter = 1
    encounter_id_counter = 1

    first_names = ["James", "Maria", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Margaret", "Anthony", "Betty", "Donald", "Sandra"]
    last_names = ["Anderson", "Rodriguez", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"]

    # Group by patient_nbr
    for patient_nbr, group in df.groupby('patient_nbr'):
        first_row = group.iloc[0]
        pid = int(patient_nbr)
        app_pid = patient_id_counter
        patient_id_counter += 1

        name_idx = app_pid % len(first_names)
        fname = first_names[name_idx]
        lname = last_names[(name_idx * 7) % len(last_names)]
        
        age_str = str(first_row.get('age', '[60-70)'))
        calc_age = parse_age(age_str)
        birth_year = 2026 - calc_age
        dob_str = f"{birth_year}-05-14"

        gender_val = str(first_row.get('gender', 'Female'))
        if gender_val in ('?', 'Unknown/Invalid'):
            gender_val = 'Female'

        race_val = str(first_row.get('race', 'Caucasian'))
        if race_val in ('?', 'None'):
            race_val = 'Other'

        # Build Safety Badges from clinical history
        safety_badges = []
        if any(r.get('readmitted') == '<30' for _, r in group.iterrows()):
            safety_badges.append('HIGH READMISSION RISK')
        if any(r.get('insulin') in ('Up', 'Down', 'Steady') for _, r in group.iterrows()):
            safety_badges.append('DIABETES')
        if any(float(r.get('number_inpatient', 0) or 0) >= 2 for _, r in group.iterrows()):
            safety_badges.append('FREQUENT ADMISSION')
        if calc_age >= 75:
            safety_badges.append('FALL RISK')

        patient_doc = {
            "id": app_pid,
            "patient_nbr": pid,
            "mrn": f"MRN-{pid}",
            "first_name": fname,
            "last_name": lname,
            "dob": dob_str,
            "age": calc_age,
            "age_group": age_str,
            "sex": gender_val,
            "gender": gender_val,
            "race": race_val,
            "ethnicity": "Non-Hispanic" if race_val != "Hispanic" else "Hispanic",
            "blood_group": "O+" if app_pid % 2 == 0 else "A+",
            "safety_badges": safety_badges,
            "current_ward": f"Ward {(app_pid % 4) + 2}B",
            "current_room": f"{(app_pid % 4) + 2}B-{100 + (app_pid % 40)}",
            "admission_status": "Inpatient",
            "record_source": "diabetic_data.csv",
            "total_encounters": len(group)
        }

        patients_collection.insert_one(patient_doc)
        imported_patients[pid] = app_pid

        # Ingest all longitudinal encounters for this patient
        for _, enc_row in group.iterrows():
            enc_id = int(enc_row['encounter_id'])
            app_enc_id = encounter_id_counter
            encounter_id_counter += 1

            diag_1 = clean_val(enc_row.get('diag_1')) or '250.00'
            diag_2 = clean_val(enc_row.get('diag_2'))
            diag_3 = clean_val(enc_row.get('diag_3'))
            diag_category = map_icd9_to_category(diag_1)

            readmit_raw = str(enc_row.get('readmitted', 'NO'))
            is_readmit_30d = (readmit_raw == '<30')

            encounter_doc = {
                "id": app_enc_id,
                "encounter_id": enc_id,
                "patient_id": app_pid,
                "patient_nbr": pid,
                "encounter_type": "Inpatient",
                "admission_type_id": int(enc_row.get('admission_type_id', 1)),
                "discharge_disposition_id": int(enc_row.get('discharge_disposition_id', 1)),
                "admission_source_id": int(enc_row.get('admission_source_id', 7)),
                "length_of_stay": int(enc_row.get('time_in_hospital', 3)),
                "time_in_hospital": int(enc_row.get('time_in_hospital', 3)),
                "payer_code": clean_val(enc_row.get('payer_code')) or "MC",
                "medical_specialty": clean_val(enc_row.get('medical_specialty')) or "InternalMedicine",
                "num_lab_procedures": int(enc_row.get('num_lab_procedures', 30)),
                "num_procedures": int(enc_row.get('num_procedures', 0)),
                "num_medications": int(enc_row.get('num_medications', 10)),
                "number_diagnoses": int(enc_row.get('number_diagnoses', 5)),
                "primary_diagnosis": f"ICD-9 {diag_1} ({diag_category})",
                "diag_1": diag_1,
                "diag_2": diag_2,
                "diag_3": diag_3,
                "diag_1_category": diag_category,
                "readmitted_outcome": readmit_raw,
                "readmitted_30d": is_readmit_30d,
                "source_data": enc_row.to_dict(),
                "created_at": "2026-08-01T10:00:00Z"
            }
            encounters_collection.insert_one(encounter_doc)
            imported_encounters_count += 1

            # Ingest Diagnoses
            diagnoses_collection.insert_one({
                "id": app_enc_id * 10 + 1,
                "patient_id": app_pid,
                "encounter_id": app_enc_id,
                "icd_code": str(diag_1),
                "description": f"Primary: {diag_category} (ICD-9 {diag_1})",
                "diagnosis_type": "Primary",
                "status": "Active",
                "diagnosed_at": "2026-08-01",
                "clinician": "Dr. Sarah Mitchell"
            })
            if diag_2:
                diagnoses_collection.insert_one({
                    "id": app_enc_id * 10 + 2,
                    "patient_id": app_pid,
                    "encounter_id": app_enc_id,
                    "icd_code": str(diag_2),
                    "description": f"Secondary Comorbidity (ICD-9 {diag_2})",
                    "diagnosis_type": "Secondary",
                    "status": "Active",
                    "diagnosed_at": "2026-08-01",
                    "clinician": "Dr. Sarah Mitchell"
                })

            # Ingest Clinical Features (Prior visits)
            clinical_features_collection.insert_one({
                "id": app_enc_id,
                "patient_id": app_pid,
                "encounter_id": app_enc_id,
                "number_outpatient": int(enc_row.get('number_outpatient', 0)),
                "number_emergency": int(enc_row.get('number_emergency', 0)),
                "number_inpatient": int(enc_row.get('number_inpatient', 0)),
                "change": str(enc_row.get('change', 'No')),
                "diabetesMed": str(enc_row.get('diabetesMed', 'Yes')),
            })

            # Ingest Observations (A1C, Glucose)
            a1c_val = clean_val(enc_row.get('A1Cresult'))
            if a1c_val:
                observations_collection.insert_one({
                    "id": app_enc_id * 10 + 1,
                    "patient_id": app_pid,
                    "encounter_id": app_enc_id,
                    "name": "Glycated Hemoglobin (HbA1c)",
                    "observation_type": "A1Cresult",
                    "value_string": a1c_val,
                    "measured_at": "2026-08-01 08:30",
                    "status": "High" if a1c_val in ('>7', '>8') else "Normal"
                })

            glu_val = clean_val(enc_row.get('max_glu_serum'))
            if glu_val:
                observations_collection.insert_one({
                    "id": app_enc_id * 10 + 2,
                    "patient_id": app_pid,
                    "encounter_id": app_enc_id,
                    "name": "Peak Serum Glucose",
                    "observation_type": "max_glu_serum",
                    "value_string": glu_val,
                    "measured_at": "2026-08-01 08:30",
                    "status": "Elevated" if glu_val in ('>200', '>300') else "Normal"
                })

            # Ingest Medications
            ins_val = clean_val(enc_row.get('insulin'))
            if ins_val and ins_val != 'No':
                medications_collection.insert_one({
                    "id": app_enc_id * 10 + 1,
                    "patient_id": app_pid,
                    "encounter_id": app_enc_id,
                    "medication_name": "Insulin (Subcutaneous)",
                    "dose": f"Titrated ({ins_val})",
                    "frequency": "Daily / Sliding Scale",
                    "status": "Active",
                    "is_active": True
                })

            met_val = clean_val(enc_row.get('metformin'))
            if met_val and met_val != 'No':
                medications_collection.insert_one({
                    "id": app_enc_id * 10 + 2,
                    "patient_id": app_pid,
                    "encounter_id": app_enc_id,
                    "medication_name": "Metformin HCl",
                    "dose": f"Oral ({met_val})",
                    "frequency": "Twice Daily",
                    "status": "Active",
                    "is_active": True
                })

    logger.info(f"ETL Complete: Ingested {len(imported_patients)} patients and {imported_encounters_count} encounters from diabetic_data.csv.")
    return {
        "status": "success",
        "patients_count": len(imported_patients),
        "encounters_count": imported_encounters_count
    }


if __name__ == "__main__":
    result = import_dataset(limit=500)
    print(json.dumps(result, indent=2))
