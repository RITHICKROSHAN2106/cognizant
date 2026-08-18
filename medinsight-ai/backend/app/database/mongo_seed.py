import datetime
import logging
from app.database.mongodb import mongodb_manager
from app.security.password import get_password_hash
from app.data.import_diabetes_dataset import import_dataset_to_mongodb

logger = logging.getLogger("medinsight.seed")


from app.security.rbac import get_role_permissions, RoleEnum, ROLE_PERMISSIONS


def seed_mongodb():
    db = mongodb_manager.db
    if db is None:
        return

    users_col = db["users"]
    roles_col = db["roles"]

    # 1. Seed Roles Collection
    if roles_col.count_documents({}) == 0:
        role_docs = [
            {
                "role": RoleEnum.ADMINISTRATOR.value,
                "display_name": "Administrator",
                "description": "System administration, workforce management, security monitoring, and institutional audit governance.",
                "category": "Administration",
                "permissions": get_role_permissions(RoleEnum.ADMINISTRATOR.value)
            },
            {
                "role": RoleEnum.PHYSICIAN.value,
                "display_name": "Physician / Doctor",
                "description": "Full inpatient EHR access, diagnostic orders, readmission risk prediction, CDS interventions, and discharge sign-off.",
                "category": "Clinical",
                "permissions": get_role_permissions(RoleEnum.PHYSICIAN.value)
            },
            {
                "role": RoleEnum.NURSE.value,
                "display_name": "Nurse",
                "description": "Inpatient surveillance, vitals recording, bedside nursing observations, care coordination, and follow-up reviews.",
                "category": "Nursing",
                "permissions": get_role_permissions(RoleEnum.NURSE.value)
            },
            {
                "role": RoleEnum.CARE_COORDINATOR.value,
                "display_name": "Care Coordinator",
                "description": "Post-discharge continuity, transition planning, high-risk surveillance, pharmacy delivery verification, and W1-W4 scheduling.",
                "category": "Care Coordination",
                "permissions": get_role_permissions(RoleEnum.CARE_COORDINATOR.value)
            },
            {
                "role": RoleEnum.DIETICIAN.value,
                "display_name": "Dietician (RD / CDE)",
                "description": "Medical Nutrition Therapy (MNT), glycemic meal planning, dietary restrictions, and carbohydrate targets.",
                "category": "Allied Health",
                "permissions": get_role_permissions(RoleEnum.DIETICIAN.value)
            },
            {
                "role": RoleEnum.REHABILITATION_SPECIALIST.value,
                "display_name": "Rehabilitation Specialist (DPT)",
                "description": "Physical therapy protocols, mobility milestones, lower-extremity conditioning, and progress tracking.",
                "category": "Allied Health",
                "permissions": get_role_permissions(RoleEnum.REHABILITATION_SPECIALIST.value)
            }
        ]
        for r in role_docs:
            roles_col.update_one({"role": r["role"]}, {"$set": r}, upsert=True)
        logger.info("Clinical roles and permissions matrix seeded.")

    # 2. Ensure Standard Clinical Staff Users are Seeded (Upsert)
    now_iso = datetime.datetime.utcnow().isoformat()
    staff_users = [
        {
            "id": 1,
            "staff_id": "DOC-00124",
            "email": "sarah.mitchell@medinsight.hospital",
            "username": "dr.sarah",
            "hashed_password": get_password_hash("doctor123"),
            "first_name": "Dr. Sarah",
            "last_name": "Mitchell",
            "full_name": "Dr. Sarah Mitchell",
            "role": RoleEnum.PHYSICIAN.value,
            "department": "Internal Medicine",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.PHYSICIAN.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "id": 2,
            "staff_id": "NUR-00891",
            "email": "emily.watson@medinsight.hospital",
            "username": "nurse.emily",
            "hashed_password": get_password_hash("nurse123"),
            "first_name": "Emily",
            "last_name": "Watson",
            "full_name": "Nurse Emily Watson, RN",
            "role": RoleEnum.NURSE.value,
            "department": "Inpatient Medical Ward 5B",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.NURSE.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "id": 3,
            "staff_id": "CRD-00432",
            "email": "alex.rivera@medinsight.hospital",
            "username": "coordinator.alex",
            "hashed_password": get_password_hash("coordinator123"),
            "first_name": "Alex",
            "last_name": "Rivera",
            "full_name": "Alex Rivera, MSW",
            "role": RoleEnum.CARE_COORDINATOR.value,
            "department": "Transitional Care & Discharge Planning",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.CARE_COORDINATOR.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "id": 4,
            "staff_id": "DIE-00311",
            "email": "elena.rostova@medinsight.hospital",
            "username": "dietician.elena",
            "hashed_password": get_password_hash("dietician123"),
            "first_name": "Elena",
            "last_name": "Rostova",
            "full_name": "Elena Rostova, RD, CDE",
            "role": RoleEnum.DIETICIAN.value,
            "department": "Clinical Nutrition & Diabetes Education",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.DIETICIAN.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "id": 5,
            "staff_id": "REH-00205",
            "email": "david.chen@medinsight.hospital",
            "username": "rehab.david",
            "hashed_password": get_password_hash("rehab123"),
            "first_name": "David",
            "last_name": "Chen",
            "full_name": "David Chen, DPT",
            "role": RoleEnum.REHABILITATION_SPECIALIST.value,
            "department": "Physical Rehabilitation & Mobility",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.REHABILITATION_SPECIALIST.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "id": 6,
            "staff_id": "ADM-00001",
            "email": "admin@medinsight.hospital",
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "first_name": "System",
            "last_name": "Administrator",
            "full_name": "System Administrator",
            "role": RoleEnum.ADMINISTRATOR.value,
            "department": "Hospital IT & Clinical Informatics",
            "facility": "MedInsight Central Hospital",
            "permissions": get_role_permissions(RoleEnum.ADMINISTRATOR.value),
            "is_active": True,
            "must_change_password": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }
    ]

    for user in staff_users:
        users_col.update_one({"username": user["username"]}, {"$set": user}, upsert=True)
    logger.info("Standard institutional staff users verified and seeded.")

    # 2. Ingest real diabetic_data.csv into MongoDB
    try:
        report = import_dataset_to_mongodb(db)
        logger.info(f"Dataset initialization result: {report}")
    except Exception as e:
        logger.error(f"Dataset import error during seed: {e}")
