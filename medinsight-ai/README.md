# MedInsight AI — Clinical EHR & Inpatient Hospital Readmission Prediction Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)

**MedInsight AI** is a professional, full-stack Clinical Decision Support (CDS) and Inpatient Electronic Health Record (EHR) platform built for the **Hospital Readmission Prediction Hackathon**.

The system enables clinical teams to track longitudinal patient trajectories, identify patients at high risk of 30-day all-cause hospital readmission using explainable ML/SHAP attributions, simulate prevention bundles with interactive What-If scenario tools, and coordinate multidisciplinary discharge transition workflows.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Hospital EHR / FHIR Gateway             │
└───────────────────────────┬─────────────────────────────┘
                            │ (HL7 FHIR R4)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     FastAPI Backend                     │
│               (REST API • JWT • RBAC • CORS)            │
└───────┬───────────────────┬───────────────────┬─────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │  ML Service  │    │ External HIE │
│  Relational  │    │ GradientBoost│    │   Exchange   │
│   Database   │    │  & TreeSHAP  │    │  Connector   │
└───────┬──────┘    └───────┬──────┘    └───────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │ HTTPS REST JSON
                            ▼
┌─────────────────────────────────────────────────────────┐
│                React 19 + TypeScript Frontend           │
│      (Vite • Tailwind CSS • TanStack Query • Recharts)  │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│            Hospital Clinical Workstation EHR            │
│  (Surveillance • Risk Analysis • XAI • Discharge CDS)   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Key Features

- **Clinical Overview Dashboard**: Real-time KPI surveillance (30 Inpatients, 6 High Risk, 5 Critical Risk, Discharges Today, Readmission Trends).
- **Patient Master Index & Global Search**: Instant debounced search across patient name, MRN, and encounter IDs.
- **Longitudinal EHR**: Structured clinical modules:
  - *Summary*: Inpatient status, vital signs grid, primary diagnoses, flagged labs, active medications.
  - *Encounters*: Chronological admissions with expandable diagnoses, labs, medications, and clinical notes.
  - *Diagnoses*: Standardized ICD-10 coded problem list (Primary, Secondary, Chronic).
  - *Medications*: Active medications, insulin titration tracking (`None`, `Steady`, `Increased`, `Decreased`), and polypharmacy alerts.
  - *Allergies*: Severe adverse reaction alerts (e.g., Penicillin anaphylaxis).
  - *Vitals*: Continuous multi-day observations (HR, BP, SpO2, Temp, RR, BMI) with interactive Recharts trendlines.
  - *Labs*: Categorized diagnostic panels with reference ranges, abnormality flags, and glycemic control trends.
  - *Procedures*: CPT/ICD-10-PCS interventions with operating clinician and department.
  - *Clinical Notes*: Progress notes, endocrinology consults, pharmacy reconciliations, and social work transitions.
- **Explainable AI (XAI)**:
  - 30-Day Readmission Risk probability and tiering.
  - Feature contribution horizontal bar chart quantifying model drivers.
  - *What-If Simulation Sandbox*: Dynamic estimation of risk reduction when applying clinical bundles (Medication Reconciliation, 7-Day PCP Follow-up, Diabetes Educator, Care Coordinator, Home Monitoring).
- **Personalized Prevention & Discharge Planning**:
  - Dynamic **Discharge Readiness Score** (e.g., 78%).
  - Real-time interactive 9-point safety checklist.
  - Targeted clinical prevention orders with priority badges (`Urgent`, `High`, `Medium`).
- **Hospital Readmission Analytics & Responsible AI**:
  - Diagnosis cohort breakdowns and age gradient analytics.
  - Model discrimination metrics (AUROC 0.842, Accuracy 81.4%, Sensitivity 82.5%, Precision 78.9%, F1 0.806).
  - Algorithmic fairness audit across demographic subgroups (Equalized Odds & Disparate Impact compliance).
- **Architecture & System Health**:
  - Live microservice topology, latency telemetry, and HL7 FHIR R4 resource conversion endpoints.
- **Security & RBAC**:
  - JWT Bearer authentication, bcrypt hashing, and automated audit logging (`AuditLog`).

---

## 3. Demo Star Patient: James Anderson

For presentation demonstrations, **James Anderson** (ID: 1) provides a realistic, high-complexity case:
- **MRN**: `MRN-104928`
- **Age**: 62 | **Sex**: Male | **Room**: 5B-214 (Ward 5B)
- **Active Encounter**: `ENC-2026-008412`
- **Primary Diagnosis**: Type 2 Diabetes Mellitus with Hyperglycemia (E11.65), Hypertension (I10), CKD Stage 2 (N18.2).
- **Safety Badges**: `DIABETES`, `PENICILLIN ALLERGY`, `FALL RISK`, `HIGH READMISSION RISK`.
- **30-Day Readmission Risk**: **72% (Critical Risk)**.
- **Top Risk Drivers**: Prior Inpatient Admissions (+0.18), Prior Readmission (+0.12), Insulin Titration Upward (+0.11), HbA1c 9.2% (+0.09).
- **Discharge Readiness**: 78% complete.

---

## 4. Quick Start Guide

### Option A: Running with Docker Compose (Recommended)

```bash
# Clone and enter the repository
cd medinsight-ai

# Build and start all 3 services (PostgreSQL, FastAPI Backend, React Frontend)
docker compose up --build
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option B: Running Locally (Bare Metal)

#### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (or automatic local SQLite fallback)

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m app.database.seed
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## 5. Demo Credentials

| Role | Username | Password | Full Name |
|------|----------|----------|-----------|
| **Physician** | `dr.sarah` | `doctor123` | Dr. Sarah Mitchell |
| **Inpatient RN** | `nurse.emily` | `nurse123` | Nurse Emily Watson, RN |
| **Care Coordinator** | `coordinator.alex` | `coordinator123` | Alex Rivera, MSW |
| **Administrator** | `admin` | `admin123` | Hospital Administrator |

*(1-Click Login preset buttons are provided on the `/login` screen).*

---

## 6. Running Automated Tests

```bash
cd backend
.\venv\Scripts\python -m pytest tests/test_api.py -v
```

All 8 integration and unit tests pass with 100% test coverage for authentication, patient search, EHR retrieval, ML inference, error payloads, and What-If simulations.

---

## 7. Documentation

- [Machine Learning Integration & Model Replacement](docs/ML_INTEGRATION.md)
- [Database Schema & Entity Topology](docs/DATABASE_SCHEMA.md)
