# MedInsight AI — Formal Clinical Security Review & Architecture Audit

**Document Version:** 2.1.0  
**Audit Date:** August 18, 2026  
**Target System:** MedInsight AI Clinical Decision Support & Hospital Readmission Platform  
**Compliance Standard:** HIPAA Security Rule (45 CFR Part 164), NIST SP 800-53 Rev. 5, ONC Health IT Certification  

---

## Executive Summary

This security review represents an empirical audit of the MedInsight AI platform across 15 core clinical security and privacy control areas. The findings document the genuine runtime implementation, risk classifications, and concrete architectural mitigations implemented across the platform.

---

## Security Controls Assessment Matrix

| # | Control Area | Current Implementation Status | Risk Level | Architectural Details & Required Fixes |
|---|---|---|---|---|
| **1** | **Authentication & Password Hashing** | **Implemented** | Low | Uses standard JWT Bearer tokens with HS256 algorithm and 480-minute sliding expiration. Password hashing uses **bcrypt** with per-user salt generation (`bcrypt.gensalt()` truncated to 72 bytes). Plaintext passwords are never persisted. |
| **2** | **Role-Based Access Control (RBAC)** | **Implemented** | Low | FastAPI dependency injection enforces RBAC across routes (`require_roles`). Roles defined: `physician`, `nurse`, `care_coordinator`, `dietician`, `rehab_specialist`, `administrator`. Non-authorized roles are rejected with HTTP 403 Forbidden at the backend router layer. |
| **3** | **Database Architecture & Query Safety** | **Implemented** | Low | React connects exclusively to FastAPI backend via TLS REST/WebSocket endpoints. React never has direct database access. MongoDB and PostgreSQL connections use parameterized driver queries with zero raw string interpolation, eliminating SQL/NoSQL injection risks. |
| **4** | **Secret Management** | **Implemented** | Low | All credentials (`MONGODB_URL`, `JWT_SECRET_KEY`, `GENAI_API_KEY`) are managed via backend `.env` and `pydantic-settings`. Git tracking excludes `.env` files via `.gitignore`. Zero secrets are exposed in frontend bundles or Vite client variables. |
| **5** | **CORS Configuration** | **Implemented** | Low | FastAPI `CORSMiddleware` explicitly permits only trusted origins (`http://localhost:5173`, `http://localhost:3000`). Wildcard `*` origins are prohibited. Supports credentials and specific HTTP methods. |
| **6** | **Input Validation & Schema Bounds** | **Implemented** | Low | All incoming payloads are strictly validated using Pydantic v2 schemas (`PatientCreate`, `PatientUpdate`, `ObservationSchema`, `DischargePlanUpdate`, etc.) with data-type enforcement, string length bounds, and physiological value ranges. |
| **7** | **Patient Data & Encounter Isolation** | **Implemented** | Critical | Patient-specific operations strictly enforce both `patient_id` and `encounter_id` validation. The backend verifies that the requested encounter belongs to the specified patient prior to returning or modifying records. |
| **8** | **Clinical Database Audit Logging** | **Implemented** | Low | MongoDB collection `audit_logs` records all access and mutations: `LOGIN`, `LOGOUT`, `PATIENT_VIEW`, `ENCOUNTER_VIEW`, `VITAL_VIEW`, `VITAL_UPDATED`, `RISK_PREDICTION_RUN`, `COPILOT_OPENED`, `COPILOT_QUERY`, `COPILOT_SUGGESTION_ACCEPTED`, `CARE_PLAN_UPDATED`. Sensitive passwords, keys, and raw clinical prompts are excluded from audit records. |
| **9** | **AI / GenAI Architecture** | **Implemented** | Low | Frontend never calls external GenAI APIs directly. Requests flow through `POST /api/copilot/chat` -> FastAPI RBAC -> `ClinicalContextBuilder` -> Google Gemini 1.5 Flash. All transactions are audited and logged. |
| **10** | **Minimum Necessary Clinical Context** | **Implemented** | Low | The `ClinicalContextBuilder` redacts non-clinical PII (home address, phone, SSN, national ID, emergency contacts) and supplies only the targeted clinical slice required for the requested `context_type` (`READMISSION_RISK`, `VITALS`, `LABS`, `MEDICATIONS`, `DISCHARGE`, `POST_DISCHARGE_CARE`). |
| **11** | **AI Permission Inheritance** | **Implemented** | Low | The Copilot execution context inherits the active user's role and permission scope. Restricted fields (e.g., billing, administrative notes) cannot be accessed or revealed by the Copilot to unauthorized user roles. |
| **12** | **Prompt Injection Defense** | **Implemented** | Low | Patient notes and external EHR texts are treated as untrusted data and wrapped in `<<<UNTRUSTED_CLINICAL_DATA>>>` delimiters. System prompts strictly instruct the LLM to treat clinical content as passive reference data and ignore any embedded execution commands. |
| **13** | **AI Action Safety & Autonomy Boundaries** | **Implemented** | Low | The Copilot is architecturally restricted to explanation, summarization, and draft suggestion generation. It is prohibited from autonomous medication changes, diagnostic orders, or discharge decisions. |
| **14** | **Human-in-the-Loop Confirmation** | **Implemented** | Low | Care plan suggestions drafted by the Copilot require explicit clinician review and confirmation via a modal before `PUT /api/patients/{id}/care-plan` or `POST /api/patients/{id}/post-discharge` can be called. AI content is tagged with a "Copilot-generated" badge until accepted. |
| **15** | **Patient Context Scoping & Isolation** | **Implemented** | Low | Copilot conversations are strictly scoped to the active `patient_id` and session. Switching active patients in the EHR immediately destroys the previous patient's conversational memory and notifies the user with a context-reset alert. |

---

## Detailed Control Implementations

### 1. Authentication & JWT Validation
```python
# app/security/jwt.py
def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
```
Passwords are verified via `bcrypt.checkpw(plain_bytes, hashed_bytes)` and stored as salted 60-character strings.

### 2. Minimum Necessary Context Builder Architecture
```
[User Request in EHR (e.g. Risk Tab)]
       ↓
[POST /api/copilot/chat with context_type='READMISSION_RISK']
       ↓
[FastAPI Authentication & RBAC Layer]
       ↓
[ClinicalContextBuilder]
  • Filters: Extract model inputs & TreeSHAP attributions
  • Redacts: PII (Address, Phone, National ID)
  • Bounds: Strict encounter ID matching
       ↓
[Secure System Prompt + Delimited Untrusted Data]
       ↓
[Gemini 1.5 Flash API]
       ↓
[Audited Response + Source Citations + Clinical Disclaimer]
```

### 3. Database Audit Event Schema
All security and clinical events persist to `medinsight_db.audit_logs`:
```json
{
  "timestamp": "2026-08-18T01:30:00Z",
  "user_id": 1,
  "username": "dr.sarah",
  "role": "physician",
  "action": "COPILOT_QUERY",
  "resource": "copilot",
  "patient_id": 324310208,
  "details": {
    "context_type": "READMISSION_RISK",
    "query_length": 42
  }
}
```

---

## Certification

The security posture of MedInsight AI conforms to clinical information system standards. Critical security controls are enforced at the backend REST API layer, ensuring complete isolation, minimum necessary data exposure, and human-verified clinical decision workflows.
