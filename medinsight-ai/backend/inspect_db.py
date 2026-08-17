import sqlite3

conn = sqlite3.connect('medinsight.db')
cursor = conn.cursor()

# List all tables with row counts
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print("=== DATABASE TABLES ===")
for t in tables:
    name = t[0]
    cursor.execute(f"SELECT COUNT(*) FROM {name}")
    count = cursor.fetchone()[0]
    print(f"  {name:<30} {count:>5} rows")

# All patients
print("\n=== PATIENTS (all 30) ===")
cursor.execute("SELECT id, mrn, first_name, last_name, age, sex, admission_status, current_ward, current_room FROM patients ORDER BY id")
for row in cursor.fetchall():
    print(f"  ID:{row[0]:<3} | {row[2]+' '+row[3]:<22} | {row[1]:<15} | Age:{row[4]} {row[5]:<7} | {row[6]:<12} | {row[7]} {row[8]}")

# Show encounters summary
print("\n=== ENCOUNTERS (all) ===")
cursor.execute("SELECT patient_id, encounter_id, encounter_type, is_current, readmission_status FROM encounters ORDER BY patient_id")
for row in cursor.fetchall():
    print(f"  Patient:{row[0]:<4} | {row[1]:<20} | {row[2]:<15} | Current:{row[3]} | {row[4]}")

# Quick data summary
print("\n=== FULL DATA SUMMARY ===")
for table in ['encounters', 'diagnoses', 'lab_results', 'medications', 'observations', 'allergies', 'procedures', 'clinical_notes', 'predictions', 'prediction_explanations', 'recommendations', 'discharge_plans', 'users', 'audit_logs']:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    c = cursor.fetchone()[0]
    print(f"  {table:<30} {c:>5} rows")

conn.close()
print("\n=== Database file: backend/medinsight.db (SQLite) ===")
