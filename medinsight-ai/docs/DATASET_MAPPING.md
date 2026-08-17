# Dataset Mapping Specification: `diabetic_data.csv`

This document defines the schema, data types, normalization rules, and mapping of the 50 columns from the UCI Diabetes 130-US Hospitals Dataset (`diabetic_data.csv`) into the MedInsight AI Enterprise EHR and Machine Learning Decision Support System.

---

## 1. Identifiers & Demographics

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `encounter_id` | `encounters.encounter_id` | Encounter ID / Visit # | ID / Tracking | Integer / String | Unique hospital encounter identifier. Primary key for visits. |
| `patient_nbr` | `patients.patient_nbr` (and `patients.mrn`) | MRN / Patient Number | Patient ID / Grouping | Integer / String | Unique patient identifier across longitudinal admissions. |
| `race` | `patients.race` | Race / Ethnicity | Categorical Feature | String | Replace `?` with `Missing`. One-Hot Encoded in ML pipeline. |
| `gender` | `patients.gender` / `patients.sex` | Sex at Birth / Gender | Categorical Feature | String | `Male`, `Female`, `Unknown/Invalid` (mapped to `Missing`). |
| `age` | `patients.age_group` (and `patients.age`) | Age Group / Estimated Age | Categorical Feature | String / Integer | Decades e.g. `[70-80)` mapped to display age 75. Categorical in ML. |
| `weight` | `patients.weight` | Recorded Weight | Not Used (97% missing) | String / Null | Replace `?` with `null`. Excluded from model due to sparsity. |

---

## 2. Hospital Admission & Encounter Administration

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `admission_type_id` | `encounters.admission_type_id` | Admission Type | Categorical Feature | Integer / String | 1=Emergency, 2=Urgent, 3=Elective, 4=Newborn, 5=Not Available, 6=NULL, 7=Trauma. |
| `discharge_disposition_id` | `encounters.discharge_disposition_id` | Discharge Disposition | Categorical Feature | Integer / String | 1=Discharged Home, 2=Short Term Hospital, 3=SNF, 6=Home Health. Exclude 11,13,14,19,20,21 (Expired/Hospice) from training. |
| `admission_source_id` | `encounters.admission_source_id` | Admission Source | Categorical Feature | Integer / String | 1=Physician Referral, 7=Emergency Room, 4=Transfer. One-Hot Encoded. |
| `time_in_hospital` | `encounters.length_of_stay` / `time_in_hospital` | Length of Stay (Days) | Numeric Feature | Integer | Number of days inpatient (1 to 14). Scaled via `StandardScaler`. |
| `payer_code` | `encounters.payer_code` | Payer / Insurance Type | Administrative | String | `MC` (Medicare), `MD` (Medicaid), `BC` (Blue Cross), `?` -> `Uninsured/Unknown`. |
| `medical_specialty` | `encounters.medical_specialty` | Admitting Specialty | Categorical Feature | String | Top 10 specialties kept; rest bucketed into `Other/Missing`. |

---

## 3. Clinical Utilization & Workload Metrics

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `num_lab_procedures` | `encounters.num_lab_procedures` | Lab Tests Ordered | Numeric Feature | Integer | Total count of diagnostic laboratory tests performed during stay. |
| `num_procedures` | `encounters.num_procedures` | Procedures Performed | Numeric Feature | Integer | Total count of non-lab surgeries / bedside procedures. |
| `num_medications` | `encounters.num_medications` | Total Medication Count | Numeric Feature | Integer | Count of distinct distinct generic medication orders. |
| `number_outpatient` | `clinical_features.number_outpatient` | Prior Outpatient Visits | Numeric Feature | Integer | Number of outpatient visits in the 12 months preceding admission. |
| `number_emergency` | `clinical_features.number_emergency` | Prior Emergency Visits | Numeric Feature | Integer | Number of emergency room visits in the 12 months preceding admission. |
| `number_inpatient` | `clinical_features.number_inpatient` | Prior Inpatient Admissions | Numeric Feature | Integer | Number of inpatient hospitalizations in the 12 months preceding admission. |

---

## 4. Diagnoses (ICD-9)

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `diag_1` | `diagnoses.diag_1` (Primary) | Primary Admitting Diagnosis | Categorical Feature (`diag_1_category`) | String | High-level clinical grouping: `Circulatory`, `Respiratory`, `Digestive`, `Diabetes`, `Injury`, `Musculoskeletal`, `Genitourinary`, `Neoplasms`, `Other`. |
| `diag_2` | `diagnoses.diag_2` (Secondary) | Secondary Comorbidity | Clinical Record | String | Preserved as ICD-9 diagnosis code and clinical description. |
| `diag_3` | `diagnoses.diag_3` (Tertiary) | Additional Comorbidity | Clinical Record | String | Preserved as ICD-9 diagnosis code and clinical description. |
| `number_diagnoses` | `encounters.number_diagnoses` | Total Diagnoses Count | Numeric Feature | Integer | Number of distinct active diagnoses entered into the record (1 to 16). |

---

## 5. Glycemic & Laboratory Diagnostic Markers

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `max_glu_serum` | `observations.max_glu_serum` | Peak Serum Glucose | Numeric (Ordinal: `max_glu_serum_ord`) | String / Integer | `None`=0, `Norm`=1, `>200`=2, `>300`=3. |
| `A1Cresult` | `observations.a1c_result` | Glycated Hemoglobin (HbA1c) | Numeric (Ordinal: `A1Cresult_ord`) | String / Integer | `None`=0, `Norm`=1, `>7`=2, `>8`=3. |

---

## 6. Diabetic Pharmacotherapy & Medication Status (23 Agents)

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `metformin` | `medications.metformin` | Metformin | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. Categorical state preserved. |
| `repaglinide` | `medications.repaglinide` | Repaglinide (Prandin) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `nateglinide` | `medications.nateglinide` | Nateglinide (Starlix) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `chlorpropamide` | `medications.chlorpropamide` | Chlorpropamide (Diabinese) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `glimepiride` | `medications.glimepiride` | Glimepiride (Amaryl) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `acetohexamide` | `medications.acetohexamide` | Acetohexamide (Dymelor) | Categorical Feature | String | `No`, `Steady`. |
| `glipizide` | `medications.glipizide` | Glipizide (Glucotrol) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `glyburide` | `medications.glyburide` | Glyburide (Diabeta) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `tolbutamide` | `medications.tolbutamide` | Tolbutamide (Orinase) | Categorical Feature | String | `No`, `Steady`. |
| `pioglitazone` | `medications.pioglitazone` | Pioglitazone (Actos) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `rosiglitazone` | `medications.rosiglitazone` | Rosiglitazone (Avandia) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `acarbose` | `medications.acarbose` | Acarbose (Precose) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `miglitol` | `medications.miglitol` | Miglitol (Glyset) | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `troglitazone` | `medications.troglitazone` | Troglitazone (Rezulin) | Categorical Feature | String | `No`, `Steady`. |
| `tolazamide` | `medications.tolazamide` | Tolazamide (Tolinase) | Categorical Feature | String | `No`, `Steady`, `Up`. |
| `examide` | `medications.examide` | Examide | Categorical Feature | String | `No`. |
| `citoglipton` | `medications.citoglipton` | Citoglipton | Categorical Feature | String | `No`. |
| `insulin` | `medications.insulin` | Insulin Regimen | Numeric (Ordinal: `insulin_ord`) | String / Integer | `No`=0, `Down`=1, `Steady`=2, `Up`=3. |
| `glyburide-metformin` | `medications.glyburide_metformin` | Glyburide-Metformin | Categorical Feature | String | `No`, `Steady`, `Up`, `Down`. |
| `glipizide-metformin` | `medications.glipizide_metformin` | Glipizide-Metformin | Categorical Feature | String | `No`, `Steady`. |
| `glimepiride-pioglitazone`| `medications.glimepiride_pioglitazone` | Glimepiride-Pioglitazone | Categorical Feature | String | `No`, `Steady`. |
| `metformin-rosiglitazone`| `medications.metformin_rosiglitazone` | Metformin-Rosiglitazone | Categorical Feature | String | `No`, `Steady`. |
| `metformin-pioglitazone` | `medications.metformin_pioglitazone` | Metformin-Pioglitazone | Categorical Feature | String | `No`, `Steady`. |
| `change` | `medications.regimen_change` | Medication Regimen Changed | Categorical Feature | String | `Ch` (Changed) or `No` (No change). |
| `diabetesMed` | `medications.diabetes_med_prescribed` | Diabetes Medication Prescribed | Categorical Feature | String | `Yes` or `No`. |

---

## 7. Readmission Outcome & Ground Truth

| Original CSV Column | Internal Database Field | Frontend Display Field | ML Feature Usage | Data Type | Transformation / Cleaning Rule |
|---|---|---|---|---|---|
| `readmitted` | `encounters.readmitted_outcome` | Historical Readmission Outcome | **TARGET VARIABLE** | String / Binary | `<30` (Positive 30-Day Readmission), `>30` (Late Readmission), `NO` (No Readmission). Protected from feature leakage. |
