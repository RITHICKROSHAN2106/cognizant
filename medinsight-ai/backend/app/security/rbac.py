"""
MedInsight AI EHR — Role-Based Access Control (RBAC) & Permissions Engine
========================================================================
Defines standardized clinical workforce roles, granular action permissions,
and centralized authorization resolution.
"""
from enum import Enum
from typing import Dict, List, Set, Optional


class RoleEnum(str, Enum):
    ADMINISTRATOR = "administrator"
    PHYSICIAN = "physician"
    NURSE = "nurse"
    CARE_COORDINATOR = "care_coordinator"
    DIETICIAN = "dietician"
    REHABILITATION_SPECIALIST = "rehab_specialist"
    REGISTRATION_STAFF = "registration_staff"
    SUPER_ADMIN = "super_admin"


class PermissionEnum(str, Enum):
    # Patient Demographics & Census
    PATIENT_VIEW = "patient:view"
    PATIENT_CREATE = "patient:create"
    PATIENT_UPDATE_DEMOGRAPHICS = "patient:update_demographics"

    # Clinical Encounters & Admissions
    ENCOUNTER_VIEW = "encounter:view"
    ENCOUNTER_CREATE = "encounter:create"

    # Diagnoses & Medical Orders
    DIAGNOSIS_VIEW = "diagnosis:view"
    DIAGNOSIS_UPDATE = "diagnosis:update"

    # Vitals & Nursing Observations
    VITALS_VIEW = "vitals:view"
    VITALS_CREATE = "vitals:create"

    # Medications & Pharmacy Reconciliation
    MEDICATIONS_VIEW = "medications:view"
    MEDICATIONS_UPDATE = "medications:update"

    # ML Readmission Risk Prediction & XAI
    PREDICTION_VIEW = "prediction:view"
    PREDICTION_RUN = "prediction:run"
    PREDICTION_EXPLAIN = "prediction:explain"

    # Post-Discharge & Longitudinal Care Plans
    CARE_PLAN_VIEW = "care_plan:view"
    CARE_PLAN_UPDATE = "care_plan:update"

    # Discharge Planning & Summaries
    DISCHARGE_VIEW = "discharge:view"
    DISCHARGE_UPDATE = "discharge:update"

    # Weekly Follow-Up Visits (W1–W4)
    FOLLOWUP_VIEW = "followup:view"
    FOLLOWUP_UPDATE = "followup:update"

    # Medical Nutrition Therapy & Dieticians
    NUTRITION_VIEW = "nutrition:view"
    NUTRITION_UPDATE = "nutrition:update"

    # Physical Rehabilitation & Mobility
    REHABILITATION_VIEW = "rehabilitation:view"
    REHABILITATION_UPDATE = "rehabilitation:update"

    # Clinical Reports & Export Engine
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"

    # Clinical Analytics & Hospital Statistics
    ANALYTICS_VIEW = "analytics:view"

    # Workforce & Staff User Management
    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DISABLE = "users:disable"

    # Role & Permission Governance
    ROLES_MANAGE = "roles:manage"

    # HIPAA Security & Audit Trail
    AUDIT_VIEW = "audit:view"
    SECURITY_VIEW = "security:view"

    # System Health, FHIR & Integrations
    SYSTEM_VIEW = "system:view"
    INTEGRATIONS_VIEW = "integrations:view"

    # AI Clinical Copilot
    COPILOT_QUERY = "copilot:query"


# Centralized Matrix: Role -> Default Allowed Permissions
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    RoleEnum.ADMINISTRATOR.value: [
        PermissionEnum.USERS_VIEW.value,
        PermissionEnum.USERS_CREATE.value,
        PermissionEnum.USERS_UPDATE.value,
        PermissionEnum.USERS_DISABLE.value,
        PermissionEnum.ROLES_MANAGE.value,
        PermissionEnum.AUDIT_VIEW.value,
        PermissionEnum.SECURITY_VIEW.value,
        PermissionEnum.SYSTEM_VIEW.value,
        PermissionEnum.INTEGRATIONS_VIEW.value,
        PermissionEnum.ANALYTICS_VIEW.value,
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.PATIENT_CREATE.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.REPORTS_EXPORT.value,
    ],
    RoleEnum.PHYSICIAN.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.PATIENT_CREATE.value,
        PermissionEnum.PATIENT_UPDATE_DEMOGRAPHICS.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.ENCOUNTER_CREATE.value,
        PermissionEnum.DIAGNOSIS_VIEW.value,
        PermissionEnum.DIAGNOSIS_UPDATE.value,
        PermissionEnum.VITALS_VIEW.value,
        PermissionEnum.VITALS_CREATE.value,
        PermissionEnum.MEDICATIONS_VIEW.value,
        PermissionEnum.MEDICATIONS_UPDATE.value,
        PermissionEnum.PREDICTION_VIEW.value,
        PermissionEnum.PREDICTION_RUN.value,
        PermissionEnum.PREDICTION_EXPLAIN.value,
        PermissionEnum.CARE_PLAN_VIEW.value,
        PermissionEnum.CARE_PLAN_UPDATE.value,
        PermissionEnum.DISCHARGE_VIEW.value,
        PermissionEnum.DISCHARGE_UPDATE.value,
        PermissionEnum.FOLLOWUP_VIEW.value,
        PermissionEnum.FOLLOWUP_UPDATE.value,
        PermissionEnum.NUTRITION_VIEW.value,
        PermissionEnum.REHABILITATION_VIEW.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.REPORTS_EXPORT.value,
        PermissionEnum.ANALYTICS_VIEW.value,
        PermissionEnum.COPILOT_QUERY.value,
        PermissionEnum.SYSTEM_VIEW.value,
    ],
    RoleEnum.NURSE.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.PATIENT_CREATE.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.DIAGNOSIS_VIEW.value,
        PermissionEnum.VITALS_VIEW.value,
        PermissionEnum.VITALS_CREATE.value,
        PermissionEnum.MEDICATIONS_VIEW.value,
        PermissionEnum.PREDICTION_VIEW.value,
        PermissionEnum.PREDICTION_EXPLAIN.value,
        PermissionEnum.CARE_PLAN_VIEW.value,
        PermissionEnum.CARE_PLAN_UPDATE.value,
        PermissionEnum.DISCHARGE_VIEW.value,
        PermissionEnum.DISCHARGE_UPDATE.value,
        PermissionEnum.FOLLOWUP_VIEW.value,
        PermissionEnum.FOLLOWUP_UPDATE.value,
        PermissionEnum.NUTRITION_VIEW.value,
        PermissionEnum.REHABILITATION_VIEW.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.COPILOT_QUERY.value,
    ],
    RoleEnum.CARE_COORDINATOR.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.PATIENT_CREATE.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.DIAGNOSIS_VIEW.value,
        PermissionEnum.PREDICTION_VIEW.value,
        PermissionEnum.PREDICTION_RUN.value,
        PermissionEnum.PREDICTION_EXPLAIN.value,
        PermissionEnum.CARE_PLAN_VIEW.value,
        PermissionEnum.CARE_PLAN_UPDATE.value,
        PermissionEnum.DISCHARGE_VIEW.value,
        PermissionEnum.DISCHARGE_UPDATE.value,
        PermissionEnum.FOLLOWUP_VIEW.value,
        PermissionEnum.FOLLOWUP_UPDATE.value,
        PermissionEnum.MEDICATIONS_VIEW.value,
        PermissionEnum.NUTRITION_VIEW.value,
        PermissionEnum.REHABILITATION_VIEW.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.REPORTS_EXPORT.value,
        PermissionEnum.ANALYTICS_VIEW.value,
        PermissionEnum.COPILOT_QUERY.value,
    ],
    RoleEnum.DIETICIAN.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.DIAGNOSIS_VIEW.value,
        PermissionEnum.MEDICATIONS_VIEW.value,
        PermissionEnum.VITALS_VIEW.value,
        PermissionEnum.CARE_PLAN_VIEW.value,
        PermissionEnum.NUTRITION_VIEW.value,
        PermissionEnum.NUTRITION_UPDATE.value,
        PermissionEnum.FOLLOWUP_VIEW.value,
        PermissionEnum.FOLLOWUP_UPDATE.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.COPILOT_QUERY.value,
    ],
    RoleEnum.REHABILITATION_SPECIALIST.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.DIAGNOSIS_VIEW.value,
        PermissionEnum.VITALS_VIEW.value,
        PermissionEnum.CARE_PLAN_VIEW.value,
        PermissionEnum.REHABILITATION_VIEW.value,
        PermissionEnum.REHABILITATION_UPDATE.value,
        PermissionEnum.FOLLOWUP_VIEW.value,
        PermissionEnum.FOLLOWUP_UPDATE.value,
        PermissionEnum.REPORTS_VIEW.value,
        PermissionEnum.COPILOT_QUERY.value,
    ],
    RoleEnum.REGISTRATION_STAFF.value: [
        PermissionEnum.PATIENT_VIEW.value,
        PermissionEnum.PATIENT_CREATE.value,
        PermissionEnum.PATIENT_UPDATE_DEMOGRAPHICS.value,
        PermissionEnum.ENCOUNTER_VIEW.value,
        PermissionEnum.ENCOUNTER_CREATE.value,
        PermissionEnum.REPORTS_VIEW.value,
    ],
    RoleEnum.SUPER_ADMIN.value: [p.value for p in PermissionEnum],
}


def get_role_permissions(role: str) -> List[str]:
    """Resolves all default permissions for a given role name (case-insensitive)."""
    norm_role = role.lower().strip()
    return ROLE_PERMISSIONS.get(norm_role, [PermissionEnum.PATIENT_VIEW.value])


def has_permission(
    user_role: str,
    user_explicit_permissions: Optional[List[str]],
    required_permission: str
) -> bool:
    """
    Checks if a user holds the requested permission via role assignment or explicit override.
    Super administrators and administrators bypass standard restrictions for operational governance.
    """
    norm_role = user_role.lower().strip()
    if norm_role in [RoleEnum.SUPER_ADMIN.value, RoleEnum.ADMINISTRATOR.value]:
        # Administrators have unrestricted administrative and patient access
        return True

    effective_perms: Set[str] = set(get_role_permissions(norm_role))
    if user_explicit_permissions:
        effective_perms.update(user_explicit_permissions)

    return required_permission in effective_perms
