import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

df = pd.read_csv('train_delay_dataset (3).csv')
threshold = joblib.load('delay_threshold.pkl')
clf = joblib.load('delay_classifier_pipeline.pkl')
reg = joblib.load('delay_model_pipeline.pkl')

# Prediction test cases
test_cases = [
    {'train_type': 'Express', 'priority': 1, 'section_id': 'BWN-GUS', 'day_of_week': 1, 'is_weekend': 0, 'time_of_day_bucket': 'Peak', 'season': 'Monsoon', 'upstream_delay_min': 5.0, 'section_congestion_level': 0.75, 'weather_flag': 1, 'track_type': 'Double'},
    {'train_type': 'Freight', 'priority': 3, 'section_id': 'SHE-SKG', 'day_of_week': 6, 'is_weekend': 1, 'time_of_day_bucket': 'Peak', 'season': 'Winter', 'upstream_delay_min': 10.0, 'section_congestion_level': 0.85, 'weather_flag': 2, 'track_type': 'Single'},
    {'train_type': 'Suburban', 'priority': 2, 'section_id': 'HWH-BLY', 'day_of_week': 3, 'is_weekend': 0, 'time_of_day_bucket': 'Off-peak', 'season': 'Summer', 'upstream_delay_min': 0.0, 'section_congestion_level': 0.30, 'weather_flag': 0, 'track_type': 'Double'},
    {'train_type': 'Passenger', 'priority': 2, 'section_id': 'GUS-PAN', 'day_of_week': 5, 'is_weekend': 0, 'time_of_day_bucket': 'Night', 'season': 'Spring', 'upstream_delay_min': 2.0, 'section_congestion_level': 0.40, 'weather_flag': 0, 'track_type': 'Single'},
    {'train_type': 'Express', 'priority': 1, 'section_id': 'MMR-BWN', 'day_of_week': 7, 'is_weekend': 1, 'time_of_day_bucket': 'Peak', 'season': 'Monsoon', 'upstream_delay_min': 8.0, 'section_congestion_level': 0.70, 'weather_flag': 2, 'track_type': 'Double'},
]

df_test = pd.DataFrame(test_cases)
preds_delay = clf.predict(df_test)
preds_proba = clf.predict_proba(df_test)
preds_reg = reg.predict(df_test)

for i, (tc, d, p, r) in enumerate(zip(test_cases, preds_delay, preds_proba, preds_reg)):
    label = "DELAYED" if d else "ON TIME"
    conf = max(p) * 100
    print(f"Case {i+1}: {tc['train_type']} | {tc['section_id']} | {tc['season']} | weather={tc['weather_flag']}")
    print(f"  -> Status: {label} (confidence: {conf:.1f}%)")
    print(f"  -> Predicted delay: {r:.1f} min")
    print()

# Model evaluation
features = ['train_type', 'priority', 'section_id', 'day_of_week', 'is_weekend', 'time_of_day_bucket', 'season', 'upstream_delay_min', 'section_congestion_level', 'weather_flag', 'track_type']
X = df[features]
y_cls = (df['delay_min'] > threshold).astype(int)
y_reg = df['delay_min']

_, X_test, _, y_test_cls = train_test_split(X, y_cls, test_size=0.2, random_state=42)
_, _, _, y_test_reg = train_test_split(X, y_reg, test_size=0.2, random_state=42)

clf_acc = clf.score(X_test, y_test_cls)
reg_preds = reg.predict(X_test)
reg_mae = mean_absolute_error(y_test_reg, reg_preds)
reg_r2 = r2_score(y_test_reg, reg_preds)

print(f"Classifier accuracy: {clf_acc*100:.2f}%")
print(f"Regressor MAE: {reg_mae:.2f} min")
print(f"Regressor R2: {reg_r2:.4f}")
