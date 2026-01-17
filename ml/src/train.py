"""
ML Training Pipeline for Czech Real Estate Price Prediction
Uses XGBoost with feature engineering for price prediction.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from sqlalchemy import create_engine

# Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://realestate:realestate_password@localhost:5432/czech_realestate"
)
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


# Feature definitions
NUMERICAL_FEATURES = [
    'area_usable', 'rooms_count', 'floor', 'floors_total', 'distance_to_center'
]

CATEGORICAL_FEATURES = [
    'property_type', 'condition', 'construction_type', 'energy_rating', 'address_city'
]

BOOLEAN_FEATURES = [
    'has_balcony', 'has_terrace', 'has_parking', 'has_elevator', 'has_cellar'
]


def load_data() -> pd.DataFrame:
    """Load property data from database."""
    engine = create_engine(DATABASE_URL)

    query = """
    SELECT
        id,
        price,
        area_usable,
        rooms_count,
        floor,
        floors_total,
        distance_to_center,
        property_type,
        condition,
        construction_type,
        energy_rating,
        address_city,
        has_balcony,
        has_terrace,
        has_parking,
        has_elevator,
        has_cellar
    FROM properties
    WHERE
        is_active = TRUE
        AND price IS NOT NULL
        AND price > 100000
        AND price < 100000000
        AND area_usable IS NOT NULL
        AND area_usable > 10
        AND area_usable < 500
        AND transaction_type = 'sale'
    """

    df = pd.read_sql(query, engine)
    print(f"Loaded {len(df)} properties from database")
    return df


def preprocess_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Preprocess data for training."""
    # Create copy
    data = df.copy()

    # Target: log(price) for better distribution
    y = np.log(data['price'].astype(float))

    # Fill missing numerical values
    for col in NUMERICAL_FEATURES:
        if col in data.columns:
            data[col] = data[col].fillna(data[col].median())

    # Fill missing categorical values
    for col in CATEGORICAL_FEATURES:
        if col in data.columns:
            data[col] = data[col].fillna('unknown')

    # Convert boolean columns
    for col in BOOLEAN_FEATURES:
        if col in data.columns:
            data[col] = data[col].fillna(False).astype(int)

    # Select features
    feature_cols = NUMERICAL_FEATURES + CATEGORICAL_FEATURES + BOOLEAN_FEATURES
    X = data[[col for col in feature_cols if col in data.columns]]

    return X, y


def train_model(X: pd.DataFrame, y: pd.Series) -> dict:
    """Train XGBoost model with cross-validation."""

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Encode categorical features
    categorical_cols = [c for c in CATEGORICAL_FEATURES if c in X.columns]
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')

    if categorical_cols:
        X_train_cat = encoder.fit_transform(X_train[categorical_cols])
        X_test_cat = encoder.transform(X_test[categorical_cols])

        # Get encoded feature names
        encoded_names = encoder.get_feature_names_out(categorical_cols)

        # Create DataFrames with encoded features
        X_train_encoded = pd.DataFrame(X_train_cat, columns=encoded_names, index=X_train.index)
        X_test_encoded = pd.DataFrame(X_test_cat, columns=encoded_names, index=X_test.index)

        # Combine with non-categorical features
        non_cat_cols = [c for c in X.columns if c not in categorical_cols]
        X_train_final = pd.concat([X_train[non_cat_cols].reset_index(drop=True),
                                   X_train_encoded.reset_index(drop=True)], axis=1)
        X_test_final = pd.concat([X_test[non_cat_cols].reset_index(drop=True),
                                  X_test_encoded.reset_index(drop=True)], axis=1)
    else:
        X_train_final = X_train
        X_test_final = X_test

    # Scale numerical features
    numerical_cols = [c for c in NUMERICAL_FEATURES if c in X_train_final.columns]
    scaler = StandardScaler()

    if numerical_cols:
        X_train_final[numerical_cols] = scaler.fit_transform(X_train_final[numerical_cols])
        X_test_final[numerical_cols] = scaler.transform(X_test_final[numerical_cols])

    # Train XGBoost model
    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )

    print("\nTraining XGBoost model...")
    model.fit(
        X_train_final, y_train,
        eval_set=[(X_test_final, y_test)],
        verbose=False
    )

    # Predictions
    y_pred_train = model.predict(X_train_final)
    y_pred_test = model.predict(X_test_final)

    # Calculate metrics (on original price scale)
    train_mae = mean_absolute_error(np.exp(y_train), np.exp(y_pred_train))
    test_mae = mean_absolute_error(np.exp(y_test), np.exp(y_pred_test))
    train_rmse = np.sqrt(mean_squared_error(np.exp(y_train), np.exp(y_pred_train)))
    test_rmse = np.sqrt(mean_squared_error(np.exp(y_test), np.exp(y_pred_test)))
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)

    # Cross-validation
    cv_scores = cross_val_score(model, X_train_final, y_train, cv=5, scoring='r2')

    metrics = {
        'train_mae': float(train_mae),
        'test_mae': float(test_mae),
        'train_rmse': float(train_rmse),
        'test_rmse': float(test_rmse),
        'train_r2': float(train_r2),
        'test_r2': float(test_r2),
        'cv_r2_mean': float(cv_scores.mean()),
        'cv_r2_std': float(cv_scores.std()),
    }

    print("\n=== Model Performance ===")
    print(f"Train MAE: {train_mae:,.0f} CZK")
    print(f"Test MAE:  {test_mae:,.0f} CZK")
    print(f"Train RMSE: {train_rmse:,.0f} CZK")
    print(f"Test RMSE:  {test_rmse:,.0f} CZK")
    print(f"Train R²: {train_r2:.4f}")
    print(f"Test R²:  {test_r2:.4f}")
    print(f"CV R² (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importance
    feature_names = X_train_final.columns.tolist()
    importance = dict(zip(feature_names, model.feature_importances_.tolist()))
    importance_sorted = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:20])

    print("\n=== Top 20 Feature Importance ===")
    for feat, imp in importance_sorted.items():
        print(f"  {feat}: {imp:.4f}")

    return {
        'model': model,
        'encoder': encoder if categorical_cols else None,
        'scaler': scaler if numerical_cols else None,
        'metrics': metrics,
        'feature_importance': importance_sorted,
        'feature_names': feature_names,
    }


def save_model(result: dict, version: str = None):
    """Save trained model and artifacts."""
    if version is None:
        version = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save model
    model_path = MODEL_DIR / "price_model.joblib"
    joblib.dump(result['model'], model_path)
    print(f"\nModel saved to {model_path}")

    # Save encoder
    if result['encoder']:
        encoder_path = MODEL_DIR / "encoder.joblib"
        joblib.dump(result['encoder'], encoder_path)
        print(f"Encoder saved to {encoder_path}")

    # Save scaler
    if result['scaler']:
        scaler_path = MODEL_DIR / "scaler.joblib"
        joblib.dump(result['scaler'], scaler_path)
        print(f"Scaler saved to {scaler_path}")

    # Save metadata
    metadata = {
        'version': version,
        'trained_at': datetime.now().isoformat(),
        'metrics': result['metrics'],
        'feature_importance': result['feature_importance'],
        'feature_names': result['feature_names'],
    }

    metadata_path = MODEL_DIR / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path}")

    return version


def update_database_model_record(version: str, metrics: dict):
    """Update ML model record in database."""
    engine = create_engine(DATABASE_URL)

    # Deactivate previous active models
    with engine.connect() as conn:
        conn.execute("UPDATE ml_models SET is_active = FALSE WHERE is_active = TRUE")
        conn.commit()

    # Insert new model record
    query = """
    INSERT INTO ml_models (model_name, model_version, model_type, metrics, is_active, model_path)
    VALUES (%s, %s, %s, %s, TRUE, %s)
    """

    with engine.connect() as conn:
        conn.execute(
            query,
            ('price_predictor', version, 'xgboost', json.dumps(metrics), str(MODEL_DIR / "price_model.joblib"))
        )
        conn.commit()

    print(f"Model record updated in database (version: {version})")


def main():
    """Main training pipeline."""
    print("=" * 50)
    print("Czech Real Estate Price Prediction - Training")
    print("=" * 50)

    # Load data
    print("\n1. Loading data...")
    df = load_data()

    if len(df) < 100:
        print("Warning: Not enough data for training. Need at least 100 samples.")
        print("Using synthetic data for demonstration...")

        # Generate synthetic data for testing
        np.random.seed(42)
        n_samples = 1000

        df = pd.DataFrame({
            'id': range(n_samples),
            'price': np.random.lognormal(15, 0.5, n_samples),  # ~3-10M CZK
            'area_usable': np.random.uniform(30, 150, n_samples),
            'rooms_count': np.random.choice([1, 2, 3, 4], n_samples),
            'floor': np.random.randint(0, 15, n_samples),
            'floors_total': np.random.randint(3, 20, n_samples),
            'distance_to_center': np.random.uniform(0.5, 20, n_samples),
            'property_type': np.random.choice(['apartment', 'house'], n_samples, p=[0.8, 0.2]),
            'condition': np.random.choice(['new', 'good', 'renovated', 'original'], n_samples),
            'construction_type': np.random.choice(['brick', 'panel', 'mixed'], n_samples),
            'energy_rating': np.random.choice(['A', 'B', 'C', 'D', 'E'], n_samples),
            'address_city': np.random.choice(['Praha', 'Brno', 'Ostrava', 'Plzeň'], n_samples, p=[0.5, 0.25, 0.15, 0.1]),
            'has_balcony': np.random.choice([True, False], n_samples),
            'has_terrace': np.random.choice([True, False], n_samples, p=[0.2, 0.8]),
            'has_parking': np.random.choice([True, False], n_samples),
            'has_elevator': np.random.choice([True, False], n_samples),
            'has_cellar': np.random.choice([True, False], n_samples),
        })

    # Preprocess
    print("\n2. Preprocessing data...")
    X, y = preprocess_data(df)
    print(f"Features shape: {X.shape}")

    # Train
    print("\n3. Training model...")
    result = train_model(X, y)

    # Save
    print("\n4. Saving model...")
    version = save_model(result)

    # Update database (optional, may fail if DB not running)
    try:
        update_database_model_record(version, result['metrics'])
    except Exception as e:
        print(f"Warning: Could not update database: {e}")

    print("\n" + "=" * 50)
    print("Training complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
