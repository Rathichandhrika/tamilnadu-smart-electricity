import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

def train_model():
    dataset_path = os.path.join('datasets', 'tn_electricity_data.csv')
    if not os.path.exists(dataset_path):
        print("❌ Dataset not found. Run dataset_generator.py first.")
        return

    # 1. Load Data
    df = pd.read_csv(dataset_path)
    X = df[['month', 'avg_temp', 'prev_month_units']]
    y = df['units_consumed']

    # 2. Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Train Random Forest
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 4. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"✅ Model Trained Successfully!")
    print(f"📊 Mean Absolute Error: {mae:.2f} units")
    print(f"📊 R² Score (Accuracy): {r2:.2f}")

    # 5. Save Model
    model_path = os.path.join('models', 'rf_bill_predictor.pkl')
    joblib.dump(model, model_path)
    print(f"💾 Model saved to {model_path}")

if __name__ == "__main__":
    train_model()