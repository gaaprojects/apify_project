import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PricePredictor:
    """ML predictor for property prices using XGBoost."""

    # Feature columns expected by the model
    NUMERICAL_FEATURES = [
        'area_usable', 'rooms_count', 'floor', 'floors_total', 'distance_to_center'
    ]

    CATEGORICAL_FEATURES = [
        'property_type', 'condition', 'construction_type', 'energy_rating', 'city'
    ]

    BOOLEAN_FEATURES = [
        'has_balcony', 'has_terrace', 'has_parking', 'has_elevator', 'has_cellar'
    ]

    # Default values for missing features
    DEFAULTS = {
        'area_usable': 60.0,
        'rooms_count': 2.0,
        'floor': 2,
        'floors_total': 5,
        'distance_to_center': 5.0,
        'property_type': 'apartment',
        'condition': 'good',
        'construction_type': 'brick',
        'energy_rating': 'C',
        'city': 'Praha',
        'has_balcony': False,
        'has_terrace': False,
        'has_parking': False,
        'has_elevator': False,
        'has_cellar': False
    }

    # City price multipliers (approximate)
    CITY_MULTIPLIERS = {
        'Praha': 1.0,
        'Brno': 0.65,
        'Ostrava': 0.45,
        'Plzeň': 0.55,
        'default': 0.5
    }

    def __init__(self):
        self.model = None
        self.encoder = None
        self.scaler = None
        self.model_loaded = False
        self._load_model()

    def _load_model(self):
        """Load trained model from disk if available."""
        model_path = Path(settings.ml_model_path)

        model_file = model_path / "price_model.joblib"
        encoder_file = model_path / "encoder.joblib"
        scaler_file = model_path / "scaler.joblib"

        if model_file.exists() and encoder_file.exists() and scaler_file.exists():
            try:
                self.model = joblib.load(model_file)
                self.encoder = joblib.load(encoder_file)
                self.scaler = joblib.load(scaler_file)
                self.model_loaded = True
                logger.info("ML model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")
                self.model_loaded = False
        else:
            logger.info("No trained model found, using rule-based fallback")
            self.model_loaded = False

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict price for a property.

        Args:
            features: Dictionary containing property features

        Returns:
            Dictionary with predicted_price, confidence, price_per_sqm, comparable_properties
        """
        if self.model_loaded:
            return self._predict_with_model(features)
        else:
            return self._predict_fallback(features)

    def _predict_with_model(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction using trained ML model."""
        # Prepare features
        prepared = self._prepare_features(features)

        # Create DataFrame
        df = pd.DataFrame([prepared])

        # Encode categorical features
        categorical_cols = [c for c in self.CATEGORICAL_FEATURES if c in df.columns]
        if categorical_cols and self.encoder:
            encoded = self.encoder.transform(df[categorical_cols])
            encoded_df = pd.DataFrame(
                encoded,
                columns=self.encoder.get_feature_names_out(categorical_cols)
            )
            df = df.drop(columns=categorical_cols)
            df = pd.concat([df, encoded_df], axis=1)

        # Scale numerical features
        numerical_cols = [c for c in self.NUMERICAL_FEATURES if c in df.columns]
        if numerical_cols and self.scaler:
            df[numerical_cols] = self.scaler.transform(df[numerical_cols])

        # Predict (model predicts log(price))
        log_prediction = self.model.predict(df)[0]
        predicted_price = np.exp(log_prediction)

        area = features.get('area_usable', self.DEFAULTS['area_usable'])
        price_per_sqm = predicted_price / area if area > 0 else 0

        return {
            'predicted_price': round(predicted_price, 0),
            'confidence': 0.85,  # Would compute from model if available
            'price_per_sqm': round(price_per_sqm, 0),
            'comparable_properties': 50  # Would compute from data
        }

    def _predict_fallback(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback prediction using simple rules when no model is available.
        Based on Czech real estate market averages.
        """
        # Base price per sqm for Praha apartments (CZK)
        base_price_per_sqm = 120000

        area = features.get('area_usable', self.DEFAULTS['area_usable'])
        city = features.get('city', self.DEFAULTS['city'])
        property_type = features.get('property_type', self.DEFAULTS['property_type'])
        condition = features.get('condition', self.DEFAULTS['condition'])
        rooms_count = features.get('rooms_count', self.DEFAULTS['rooms_count'])

        # Apply city multiplier
        city_mult = self.CITY_MULTIPLIERS.get(city, self.CITY_MULTIPLIERS['default'])

        # Property type adjustment
        type_mult = 1.0 if property_type == 'apartment' else 0.85

        # Condition adjustment
        condition_mults = {
            'new': 1.15,
            'renovated': 1.05,
            'good': 1.0,
            'original': 0.85,
            'to_renovate': 0.70
        }
        cond_mult = condition_mults.get(condition, 1.0)

        # Room count adjustment (smaller = higher per sqm)
        rooms_mult = 1.0
        if rooms_count:
            if rooms_count <= 1:
                rooms_mult = 1.1
            elif rooms_count >= 4:
                rooms_mult = 0.95

        # Floor adjustment
        floor = features.get('floor', 2)
        floors_total = features.get('floors_total', 5)
        floor_mult = 1.0
        if floor == 0:  # Ground floor
            floor_mult = 0.95
        elif floors_total and floor == floors_total:  # Top floor
            floor_mult = 1.02

        # Features adjustment
        features_bonus = 0
        if features.get('has_balcony'):
            features_bonus += 0.02
        if features.get('has_terrace'):
            features_bonus += 0.04
        if features.get('has_parking'):
            features_bonus += 0.03
        if features.get('has_elevator'):
            features_bonus += 0.01
        if features.get('has_cellar'):
            features_bonus += 0.01

        # Distance to center adjustment
        distance = features.get('distance_to_center', 5.0)
        distance_mult = 1.0
        if distance:
            if distance < 2:
                distance_mult = 1.15
            elif distance < 5:
                distance_mult = 1.05
            elif distance > 10:
                distance_mult = 0.90

        # Calculate final price per sqm
        price_per_sqm = (
            base_price_per_sqm
            * city_mult
            * type_mult
            * cond_mult
            * rooms_mult
            * floor_mult
            * distance_mult
            * (1 + features_bonus)
        )

        predicted_price = price_per_sqm * area

        return {
            'predicted_price': round(predicted_price, 0),
            'confidence': 0.60,  # Lower confidence for rule-based
            'price_per_sqm': round(price_per_sqm, 0),
            'comparable_properties': 0
        }

    def _prepare_features(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare features for model input, filling missing values."""
        prepared = {}

        # Numerical features
        for feat in self.NUMERICAL_FEATURES:
            value = features.get(feat)
            prepared[feat] = float(value) if value is not None else self.DEFAULTS[feat]

        # Categorical features
        for feat in self.CATEGORICAL_FEATURES:
            value = features.get(feat)
            prepared[feat] = str(value) if value else self.DEFAULTS[feat]

        # Boolean features
        for feat in self.BOOLEAN_FEATURES:
            value = features.get(feat)
            prepared[feat] = bool(value) if value is not None else self.DEFAULTS[feat]

        return prepared

    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importance from trained model."""
        if not self.model_loaded or not hasattr(self.model, 'feature_importances_'):
            return None

        # This would need the feature names from training
        return None
