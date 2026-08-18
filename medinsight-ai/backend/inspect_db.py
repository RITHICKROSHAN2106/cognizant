"""
MedInsight AI MongoDB Inspection Utility
Inspects MongoDB collections, documents, patient counts, and indexes.
"""
from app.database.mongodb import mongodb_manager

db = mongodb_manager.get_db()

print("=== MEDINSIGHT MONGODB INSPECTOR ===")
print(f"Active Engine: {'MongoDB Cluster' if mongodb_manager.is_atlas else 'In-Memory Document Store'}")

collections = ["users", "patients", "encounters", "diagnoses", "observations", "medications", 
               "allergies", "procedures", "notes", "predictions", "prediction_explanations", 
               "recommendations", "discharge_plans", "post_discharge_care_plans", "audit_logs"]

print("\n=== COLLECTION RECORD COUNTS ===")
for col_name in collections:
    col = db[col_name]
    count = col.count_documents({}) if hasattr(col, "count_documents") else len(list(col.find({})))
    print(f"  {col_name:<30} {count:>6} documents")

# Inspect Patients
print("\n=== REGISTERED PATIENTS SAMPLE ===")
patients = list(db["patients"].find({}).limit(10))
for p in patients:
    pid = p.get("id")
    mrn = p.get("mrn", "N/A")
    name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
    age = p.get("age", "N/A")
    sex = p.get("sex", p.get("gender", "N/A"))
    source = p.get("record_source", "UNKNOWN")
    risk = p.get("risk_level", "N/A")
    print(f"  ID:{pid:<4} | {name:<22} | {mrn:<15} | Age:{age} {sex:<6} | Risk:{risk:<8} | Source:{source}")

# Inspect Encounters
print("\n=== ENCOUNTERS SAMPLE ===")
encounters = list(db["encounters"].find({}).limit(10))
for e in encounters:
    pid = e.get("patient_id")
    enc_id = e.get("encounter_id", "N/A")
    enc_type = e.get("encounter_type", "Inpatient")
    adm_date = e.get("admission_date", "N/A")
    readm = e.get("readmission_status", "N/A")
    print(f"  Patient:{pid:<4} | Enc:{enc_id:<16} | Type:{enc_type:<18} | Adm:{adm_date} | Outcome:{readm}")

print("\n=== Verification Complete ===")
