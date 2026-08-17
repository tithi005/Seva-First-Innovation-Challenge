import joblib
import numpy as np

clf_pipe = joblib.load('delay_classifier_pipeline.pkl')
reg_pipe = joblib.load('delay_model_pipeline.pkl')

# --- Classifier feature importance ---
clf = clf_pipe.named_steps['classifier']
pre = clf_pipe.named_steps['preprocessor']
feature_names = pre.get_feature_names_out()
importances = clf.feature_importances_

# Sort
idx = np.argsort(importances)[::-1]
print("=== RandomForest Feature Importances ===")
for i in idx[:15]:
    print(f"  {feature_names[i]:<45} {importances[i]*100:.2f}%")

# Group by original feature
print()
print("=== Grouped by original feature ===")
raw_features = ['train_type', 'priority', 'section_id', 'day_of_week', 'is_weekend',
                'time_of_day_bucket', 'season', 'upstream_delay_min',
                'section_congestion_level', 'weather_flag', 'track_type']

grouped = {}
for i, fname in enumerate(feature_names):
    for rf in raw_features:
        if fname.startswith(rf) or fname.endswith(rf) or rf in fname:
            if rf not in grouped:
                grouped[rf] = 0.0
            grouped[rf] += importances[i]
            break

for k, v in sorted(grouped.items(), key=lambda x: -x[1]):
    print(f"  {k:<35} {v*100:.2f}%")

# --- Regressor feature importance ---
print()
print("=== HistGradientBoosting Feature Importances ===")
reg = reg_pipe.named_steps['regressor']
# HGB doesn't have feature_importances_ directly in older sklearn; try
try:
    reg_imp = reg.feature_importances_
    pre_r = reg_pipe.named_steps['preprocessor']
    feat_r = pre_r.get_feature_names_out()
    idx_r = np.argsort(reg_imp)[::-1]
    for i in idx_r[:10]:
        print(f"  {feat_r[i]:<45} {reg_imp[i]*100:.2f}%")
except AttributeError:
    print("  (not available for this sklearn version)")
