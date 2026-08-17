import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

warnings.filterwarnings('ignore')

SEED = 42
np.random.seed(SEED)

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../diabetic_data.csv"))
ARTIFACT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "artifacts"))
os.makedirs(ARTIFACT_DIR, exist_ok=True)

print(f"Loading dataset from {DATA_PATH}...")
raw = pd.read_csv(DATA_PATH)
print(f"Raw dataset shape: {raw.shape}")

# Preprocessing & Target Definition
# Filter out death/hospice discharges (codes 11, 13, 14, 19, 20, 21)
death_hospice_codes = [11, 13, 14, 19, 20, 21]
tab = raw[~raw['discharge_disposition_id'].isin(death_hospice_codes)].copy()

# Target: 30-day readmission (<30)
tab['readmitted_30d'] = (tab['readmitted'] == '<30').astype(int)
TARGET = 'readmitted_30d'

# ICD-9 Categorization
def map_icd9_to_category(code):
    if pd.isna(code):
        return 'Missing'
    code = str(code)
    if code.startswith('250'):
        return 'Diabetes'
    if code.startswith('V') or code.startswith('E'):
        return 'Other'
    try:
        num = float(code)
        if 390 <= num <= 459 or num == 785:
            return 'Circulatory'
        elif 460 <= num <= 519 or num == 786:
            return 'Respiratory'
        elif 520 <= num <= 579 or num == 787:
            return 'Digestive'
        elif 580 <= num <= 629 or num == 788:
            return 'Genitourinary'
        elif 800 <= num <= 999:
            return 'Injury'
        elif 710 <= num <= 739:
            return 'Musculoskeletal'
        elif 140 <= num <= 239:
            return 'Neoplasms'
        else:
            return 'Other'
    except ValueError:
        return 'Other'

tab['diag_1_category'] = tab['diag_1'].apply(map_icd9_to_category)

# Group medical specialty
top_specialties = tab['medical_specialty'].value_counts().nlargest(10).index.tolist()
tab['medical_specialty_grp'] = tab['medical_specialty'].where(
    tab['medical_specialty'].isin(top_specialties), other='Other/Missing').fillna('Other/Missing')

# Ordinal encodings
a1c_map = {'None': 0, 'Norm': 1, '>7': 2, '>8': 3}
ins_map = {'No': 0, 'Down': 1, 'Steady': 2, 'Up': 3}
glu_map = {'None': 0, 'Norm': 1, '>200': 2, '>300': 3}

tab['A1Cresult_ord'] = tab['A1Cresult'].map(a1c_map).fillna(0)
tab['insulin_ord'] = tab['insulin'].map(ins_map).fillna(0)
tab['max_glu_serum_ord'] = tab['max_glu_serum'].map(glu_map).fillna(0)

# Feature definitions
NUMERIC_FEATURES = [
    'time_in_hospital', 'num_lab_procedures', 'num_procedures', 'num_medications',
    'number_outpatient', 'number_emergency', 'number_inpatient', 'number_diagnoses',
    'A1Cresult_ord', 'insulin_ord', 'max_glu_serum_ord'
]

CATEGORICAL_FEATURES = [
    'race', 'gender', 'age', 'admission_type_id', 'discharge_disposition_id',
    'admission_source_id', 'diag_1_category', 'medical_specialty_grp',
    'change', 'diabetesMed'
]

for c in CATEGORICAL_FEATURES:
    tab[c] = tab[c].astype(str).fillna('Missing')

# Patient-grouped chronological split (70% train, 15% val, 15% test)
patient_first_enc = tab.groupby('patient_nbr')['encounter_id'].min().sort_values()
patients_ordered = patient_first_enc.index.to_numpy()

n_p = len(patients_ordered)
n_train_p = int(0.70 * n_p)
n_val_p = int(0.15 * n_p)

train_patients = set(patients_ordered[:n_train_p])
val_patients = set(patients_ordered[n_train_p:n_train_p + n_val_p])
test_patients = set(patients_ordered[n_train_p + n_val_p:])

split_train = tab[tab['patient_nbr'].isin(train_patients)]
split_val = tab[tab['patient_nbr'].isin(val_patients)]
split_test = tab[tab['patient_nbr'].isin(test_patients)]

print(f"Train: {len(split_train)}, Val: {len(split_val)}, Test: {len(split_test)}")

# Preprocessing Pipeline
preprocessor = ColumnTransformer(transformers=[
    ('num', StandardScaler(), NUMERIC_FEATURES),
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
], remainder='drop')

Xtr_raw = split_train[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
ytr_raw = split_train[TARGET].values

Xval_raw = split_val[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
yval_raw = split_val[TARGET].values

Xte_raw = split_test[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
yte_raw = split_test[TARGET].values

Xtr = preprocessor.fit_transform(Xtr_raw)
Xval = preprocessor.transform(Xval_raw)
Xte = preprocessor.transform(Xte_raw)

# Get feature names
cat_encoder = preprocessor.named_transformers_['cat']
cat_feature_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES)
feature_names_ohe = np.concatenate([NUMERIC_FEATURES, cat_feature_names])

print(f"Total features after OneHotEncoder: {len(feature_names_ohe)}")

# Model Training
scale_pos_weight = float((ytr_raw == 0).sum() / max(1, (ytr_raw == 1).sum()))

# 1. XGBoost Model
import xgboost as xgb
xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=min(scale_pos_weight, 2.5),
    random_state=SEED,
    eval_metric='logloss'
)

# 2. LightGBM Model (or Random Forest fallback if lightgbm is missing)
try:
    import lightgbm as lgb
    lgb_model = lgb.LGBMClassifier(
        n_estimators=300,
        num_leaves=31,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=min(scale_pos_weight, 2.5),
        random_state=SEED,
        verbose=-1
    )
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    lgb_model = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=SEED)

print("Training XGBoost...")
xgb_model.fit(Xtr, ytr_raw)

print("Training LightGBM / Baseline...")
lgb_model.fit(Xtr, ytr_raw)

# Feature Importance Selection (Keep 95% cumulative gain, min 25 features)
importances = pd.Series(xgb_model.feature_importances_, index=feature_names_ohe).sort_values(ascending=False)
cum = importances.cumsum() / importances.sum()
n_keep = max(25, int((cum <= 0.95).sum()))
keep_features = importances.index[:n_keep]
keep_mask = np.isin(feature_names_ohe, keep_features)

print(f"Selected {n_keep} high-impact clinical features.")

Xtr_sel = Xtr[:, keep_mask]
Xval_sel = Xval[:, keep_mask]
Xte_sel = Xte[:, keep_mask]

# Re-fit on selected features
xgb_model.fit(Xtr_sel, ytr_raw)
lgb_model.fit(Xtr_sel, ytr_raw)

# Probability predictions on validation set
prob_xgb_val = xgb_model.predict_proba(Xval_sel)[:, 1]
prob_lgb_val = lgb_model.predict_proba(Xval_sel)[:, 1]

# Isotonic Calibration
iso_xgb = IsotonicRegression(out_of_bounds='clip').fit(prob_xgb_val, yval_raw)
iso_lgb = IsotonicRegression(out_of_bounds='clip').fit(prob_lgb_val, yval_raw)

prob_xgb_test_cal = iso_xgb.predict(xgb_model.predict_proba(Xte_sel)[:, 1])
prob_lgb_test_cal = iso_lgb.predict(lgb_model.predict_proba(Xte_sel)[:, 1])
final_test_prob = 0.5 * prob_xgb_test_cal + 0.5 * prob_lgb_test_cal

# Evaluate on Test Set
test_auc = roc_auc_score(yte_raw, final_test_prob)
print(f"Test Set AUROC: {test_auc:.4f}")

# Threshold selection
thresholds = np.linspace(0.1, 0.9, 81)
f1_scores = [f1_score(yval_raw, (0.5 * iso_xgb.predict(prob_xgb_val) + 0.5 * iso_lgb.predict(prob_lgb_val) >= t).astype(int), zero_division=0) for t in thresholds]
best_threshold = float(thresholds[np.argmax(f1_scores)])
print(f"Optimal Decision Threshold: {best_threshold:.3f}")

# Export Model Artifacts
joblib.dump(preprocessor, os.path.join(ARTIFACT_DIR, 'preprocessor.joblib'))
joblib.dump(xgb_model, os.path.join(ARTIFACT_DIR, 'xgboost_final.joblib'))
joblib.dump(lgb_model, os.path.join(ARTIFACT_DIR, 'lightgbm_final.joblib'))
joblib.dump(iso_xgb, os.path.join(ARTIFACT_DIR, 'isotonic_xgb.joblib'))
joblib.dump(iso_lgb, os.path.join(ARTIFACT_DIR, 'isotonic_lgb.joblib'))

metadata = {
    'numeric_features': NUMERIC_FEATURES,
    'categorical_features': CATEGORICAL_FEATURES,
    'keep_mask': keep_mask.tolist(),
    'feature_names_ohe': feature_names_ohe.tolist(),
    'decision_threshold': best_threshold,
    'death_hospice_discharge_codes_excluded': death_hospice_codes,
    'a1c_map': a1c_map,
    'insulin_map': ins_map,
    'max_glu_serum_map': glu_map,
    'test_auroc': float(test_auc),
    'model_name': 'MedInsight-Ensemble-XGBoost-LightGBM',
    'model_version': 'prod-v2.1',
    'is_demo': False
}

with open(os.path.join(ARTIFACT_DIR, 'metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"Successfully exported all model artifacts to {ARTIFACT_DIR}!")
