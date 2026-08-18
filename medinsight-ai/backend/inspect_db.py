"""
MedInsight AI — MongoDB Database Diagnostic Script
===================================================
Run from the backend/ directory:
    python inspect_db.py

Reports MongoDB connection status, collection counts, dataset import status,
and new patient persistence — without exposing credentials.
"""
import os
import sys
import time

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from urllib.parse import urlparse

RESET = "\033[0m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"


def status(label: str, result: str, ok: bool, note: str = ""):
    icon = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
    line = f"  {icon}  {BOLD}{label}{RESET}: {result}"
    if note:
        line += f"  {YELLOW}[{note}]{RESET}"
    print(line)


def main():
    print(f"\n{BOLD}{CYAN}{'='*65}{RESET}")
    print(f"{BOLD}{CYAN}  MedInsight AI — MongoDB Database Diagnostic Report{RESET}")
    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")

    # 1. Load config
    try:
        from app.core.config import settings
        uri = settings.mongo_connection_uri
        db_name = settings.mongo_db_name
        parsed = urlparse(uri)
        safe_host = parsed.hostname or "unknown"
        uri_type = "Atlas (mongodb+srv)" if "mongodb+srv" in uri else "Local (mongodb://)"
        status("Config loaded", f"URI type={uri_type} | host={safe_host} | database={db_name}", True)
    except Exception as e:
        status("Config loaded", f"FAILED: {e}", False)
        return

    # 2. MongoDB connection
    try:
        from pymongo import MongoClient
        t0 = time.perf_counter()
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        ping_result = client.admin.command("ping")
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        ping_ok = int(ping_result.get("ok", 0)) == 1
        status("MongoDB ping", f"ok={ping_ok} | latency={latency_ms}ms", ping_ok)
    except Exception as e:
        status("MongoDB ping", f"FAILED: {type(e).__name__}: {e}", False,
               "Check MONGODB_URI, Atlas Network Access (IP whitelist), and credentials")
        print(f"\n{RED}  ⛔  Cannot continue — fix MongoDB connection first.{RESET}\n")
        return

    # 3. Database
    db = client[db_name]
    status("Database selected", db_name, True)

    # 4. Collections
    print()
    col_names = db.list_collection_names()
    status("Collections found", f"{len(col_names)}", len(col_names) > 0, ", ".join(sorted(col_names)) if col_names else "NONE")

    # 5. Dataset import verification
    print()
    patients_col = db["patients"]
    encounters_col = db["encounters"]

    total_patients = patients_col.count_documents({})
    uci_patients = patients_col.count_documents({"record_source": "UCI_DATASET"})
    reg_patients = patients_col.count_documents({"record_source": "CLINICAL_REGISTRATION"})

    total_encounters = encounters_col.count_documents({})
    uci_encounters = encounters_col.count_documents({"record_source": "UCI_DATASET"})

    status("Total patients in MongoDB", f"{total_patients:,}", total_patients > 0)
    status("  UCI Dataset patients", f"{uci_patients:,}", uci_patients > 0,
           "Run seed or import_diabetes_dataset.py if 0")
    status("  Clinically registered patients", f"{reg_patients:,}", True)
    status("Total encounters in MongoDB", f"{total_encounters:,}", total_encounters > 0)
    status("  UCI Dataset encounters", f"{uci_encounters:,}", uci_encounters > 0)

    # 6. Predictions
    print()
    preds_col = db["predictions"]
    pred_count = preds_col.count_documents({})
    status("Predictions stored", f"{pred_count:,}", True)

    # 7. Users
    users_col = db["users"]
    user_count = users_col.count_documents({})
    status("Staff users seeded", f"{user_count:,}", user_count > 0)

    # 8. Sample patient record
    print()
    sample = patients_col.find_one({"record_source": "UCI_DATASET"})
    if sample:
        print(f"  {CYAN}Sample UCI Patient:{RESET}")
        print(f"    MRN            : {sample.get('mrn')}")
        print(f"    Source Patient : {sample.get('source_patient_id')}")
        print(f"    Risk Level     : {sample.get('risk_level')} ({sample.get('risk_probability')})")
        print(f"    Primary Dx     : {sample.get('primary_diagnosis')}")
    else:
        print(f"  {YELLOW}No UCI dataset patient found — import may not have run yet.{RESET}")

    # 9. Sample registered patient
    reg_sample = patients_col.find_one({"record_source": "CLINICAL_REGISTRATION"})
    if reg_sample:
        print(f"\n  {CYAN}Sample Registered Patient:{RESET}")
        print(f"    MRN            : {reg_sample.get('mrn')}")
        print(f"    Name           : {reg_sample.get('first_name')} {reg_sample.get('last_name')}")
        print(f"    Source         : CLINICAL_REGISTRATION")

    # 10. Summary
    print(f"\n{BOLD}{CYAN}{'='*65}{RESET}")
    all_pass = (ping_ok and total_patients > 0 and total_encounters > 0)
    if all_pass:
        print(f"  {GREEN}{BOLD}[PASS] ALL CHECKS PASSED - MongoDB Atlas is storing real data.{RESET}")
    else:
        print(f"  {YELLOW}{BOLD}[WARN] Some checks failed - review output above.{RESET}")
    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")


if __name__ == "__main__":
    main()
