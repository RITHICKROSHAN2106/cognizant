import datetime
import logging
from app.database.mongodb import mongodb_manager
from app.security.password import get_password_hash
from app.data.import_diabetes_dataset import import_dataset_to_mongodb

logger = logging.getLogger("medinsight.seed")


def seed_mongodb():
    db = mongodb_manager.db
    users_col = db["users"]

    # 1. Ensure Standard Clinical Users are Seeded
    if users_col.count_documents({"username": "dr.sarah"}) == 0:
        users = [
            {
                "id": 1,
                "email": "sarah.mitchell@medinsight.hospital",
                "username": "dr.sarah",
                "hashed_password": get_password_hash("doctor123"),
                "full_name": "Dr. Sarah Mitchell",
                "role": "physician",
                "department": "Internal Medicine",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "email": "emily.watson@medinsight.hospital",
                "username": "nurse.emily",
                "hashed_password": get_password_hash("nurse123"),
                "full_name": "Nurse Emily Watson, RN",
                "role": "nurse",
                "department": "Inpatient Medical Ward 5B",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            },
            {
                "id": 3,
                "email": "alex.rivera@medinsight.hospital",
                "username": "coordinator.alex",
                "hashed_password": get_password_hash("coordinator123"),
                "full_name": "Alex Rivera, MSW",
                "role": "care_coordinator",
                "department": "Transitional Care & Discharge Planning",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            },
            {
                "id": 4,
                "email": "elena.rostova@medinsight.hospital",
                "username": "dietician.elena",
                "hashed_password": get_password_hash("dietician123"),
                "full_name": "Elena Rostova, RD, CDE",
                "role": "dietician",
                "department": "Clinical Nutrition & Diabetes Education",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            },
            {
                "id": 5,
                "email": "david.chen@medinsight.hospital",
                "username": "rehab.david",
                "hashed_password": get_password_hash("rehab123"),
                "full_name": "David Chen, DPT",
                "role": "rehab_specialist",
                "department": "Physical Rehabilitation & Mobility",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            },
            {
                "id": 6,
                "email": "admin@medinsight.hospital",
                "username": "admin",
                "hashed_password": get_password_hash("admin123"),
                "full_name": "System Administrator",
                "role": "administrator",
                "department": "Hospital IT & Clinical Informatics",
                "is_active": True,
                "created_at": datetime.datetime.utcnow().isoformat()
            }
        ]
        users_col.insert_many(users)
        logger.info("Standard institutional staff users seeded.")

    # 2. Ingest real diabetic_data.csv into MongoDB
    try:
        report = import_dataset_to_mongodb(db)
        logger.info(f"Dataset initialization result: {report}")
    except Exception as e:
        logger.error(f"Dataset import error during seed: {e}")
