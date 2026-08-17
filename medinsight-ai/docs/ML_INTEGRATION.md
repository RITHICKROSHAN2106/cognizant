# MedInsight AI — Machine Learning Pipeline & Readmission Model Integration

## 1. Overview & Dataset Source

- **Dataset**: `diabetic_data.csv` (101,766 inpatient encounters, 50 columns) from the Diabetes 130-US Hospitals 1999–2008 dataset.
- **Training Source**: `diabetes_readmission_notebook_final_model (1).ipynb`
- **Target Variable**: 30-Day Readmission (`readmitted == '<30'`, binary outcome `0` vs `1`).
- **Data Leakage Protection**: Strict removal of ground truth target columns (`readmitted`, `readmitted_30d`, `readmitted_outcome`) prior to inference. Encounters resulting in hospice or mortality (Discharge Disposition IDs `11, 13, 14, 19, 20, 21`) are explicitly excluded.

---

## 2. Model Architecture & Pipeline Artifacts

The production model artifacts are stored in `backend/app/ml/artifacts/`:

| Artifact | File | Description |
| :--- | :--- | :--- |
| **Preprocessor** | `preprocessor.joblib` | `ColumnTransformer` with `StandardScaler` on 11 numeric features and `OneHotEncoder` on 10 categorical features |
| **LightGBM Classifier** | `lightgbm_final.joblib` | Tuned LightGBM decision tree ensemble |
| **XGBoost Classifier** | `xgboost_final.joblib` | Tuned XGBoost gradient boosted decision tree |
| **Isotonic Calibrator (LGB)** | `isotonic_lgb.joblib` | Isotonic Regression calibration mapping for LightGBM raw probabilities |
| **Isotonic Calibrator (XGB)** | `isotonic_xgb.joblib` | Isotonic Regression calibration mapping for XGBoost raw probabilities |
| **Pipeline Metadata** | `metadata.json` | Feature schema, category definitions, ordinal mappings, and evaluation metrics |

---

## 3. Feature Engineering & Schema

### Numeric Features (11 Variables)
1. `time_in_hospital` (Inpatient length of stay in days)
2. `num_lab_procedures` (Total laboratory tests performed)
3. `num_procedures` (Non-lab surgical/diagnostic procedures)
4. `num_medications` (Distinct medications administered)
5. `number_outpatient` (Outpatient visits in the preceding 12 months)
6. `number_emergency` (Emergency department visits in the preceding 12 months)
7. `number_inpatient` (Inpatient admissions in the preceding 12 months)
8. `number_diagnoses` (Number of recorded ICD-9 diagnostic codes)
9. `A1Cresult_ord` (Ordinal encoding: None=0, Norm=1, >7=2, >8=3)
10. `insulin_ord` (Ordinal encoding: No=0, Down=1, Steady=2, Up=3)
11. `max_glu_serum_ord` (Ordinal encoding: None=0, Norm=1, >200=2, >300=3)

### Categorical Features (10 Variables)
1. `race` (`Caucasian`, `AfricanAmerican`, `Hispanic`, `Asian`, `Other`, `?`)
2. `gender` (`Female`, `Male`)
3. `age` (Age bracket `[0-10)` through `[90-100)`)
4. `admission_type_id` (Emergency=1, Urgent=2, Elective=3, Newborn=4, Trauma=7, etc.)
5. `discharge_disposition_id` (Home=1, SNF=3, Rehab=6, Home Health=8, etc.)
6. `admission_source_id` (Physician Referral=1, Clinic=2, Emergency Room=7, etc.)
7. `diag_1_category` (ICD-9 classification: Circulatory, Respiratory, Digestive, Diabetes, Genitourinary, Neoplasms, Musculoskeletal, Injury, Other)
8. `medical_specialty_grp` (InternalMedicine, Cardiology, Surgery-General, Emergency/Trauma, FamilyPractice, Nephrology, Other/Missing)
9. `change` (`Ch` = change in diabetic medications, `No` = no change)
10. `diabetesMed` (`Yes` = diabetic medication prescribed, `No` = none)

---

## 4. Probability Calibration & Decision Threshold

- **Ensemble Combination**:
  $$p_{\text{calibrated}} = 0.5 \cdot \text{Iso}_{\text{LGB}}(p_{\text{LGB}}) + 0.5 \cdot \text{Iso}_{\text{XGB}}(p_{\text{XGB}})$$
- **Decision Threshold**: `0.45` (F1-optimal on validation cohort).
- **Risk Stratification**:
  - **Critical Risk**: $p \ge 0.70$
  - **High Risk**: $0.45 \le p < 0.70$
  - **Moderate Risk**: $0.25 \le p < 0.45$
  - **Low Risk**: $p < 0.25$

---

## 5. Explainable AI (SHAP TreeExplainer)

Feature contributions are calculated via `shap.TreeExplainer` on the gradient boosted trees. The SHAP values quantify the exact positive or negative log-odds shift attributable to each clinical feature.

> **Clinical Disclaimer**: Model contributions describe predictive mathematical influence within the trained cohort and do not establish clinical causation.
