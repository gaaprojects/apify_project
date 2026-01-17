from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.services.property_service import PropertyService
from app.ml.predictor import PricePredictor
from app.schemas.property import (
    PredictionRequest, PredictionResponse,
    BatchPredictionRequest, BatchPredictionResponse
)
from app.config import get_settings

router = APIRouter()
settings = get_settings()

# Initialize predictor (singleton)
predictor = PricePredictor()


@router.post("/predict", response_model=PredictionResponse)
def predict_price(request: PredictionRequest):
    """Predict price for a single property based on features."""
    try:
        result = predictor.predict(request.model_dump())
        return PredictionResponse(
            predicted_price=result['predicted_price'],
            confidence=result['confidence'],
            price_per_sqm=result['price_per_sqm'],
            comparable_properties=result['comparable_properties']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/batch", response_model=BatchPredictionResponse)
def batch_predict(
    request: BatchPredictionRequest,
    db: Session = Depends(get_db)
):
    """Run predictions for multiple properties and update database."""
    service = PropertyService(db)
    updated = 0
    failed = 0
    errors = []

    for property_id in request.property_ids:
        try:
            property = service.get_property(property_id)
            if not property:
                errors.append(f"Property {property_id} not found")
                failed += 1
                continue

            # Build features from property
            features = {
                'property_type': property.property_type,
                'transaction_type': property.transaction_type or 'sale',
                'area_usable': float(property.area_usable) if property.area_usable else 0,
                'rooms_count': float(property.rooms_count) if property.rooms_count else 0,
                'floor': property.floor,
                'floors_total': property.floors_total,
                'condition': property.condition,
                'construction_type': property.construction_type,
                'energy_rating': property.energy_rating,
                'city': property.address_city,
                'has_balcony': property.has_balcony,
                'has_terrace': property.has_terrace,
                'has_parking': property.has_parking,
                'has_elevator': property.has_elevator,
                'has_cellar': property.has_cellar,
                'distance_to_center': float(property.distance_to_center) if property.distance_to_center else None
            }

            result = predictor.predict(features)

            # Calculate assessment
            if property.price:
                actual_price = float(property.price)
                predicted_price = result['predicted_price']
                deviation = (actual_price - predicted_price) / predicted_price

                if deviation < settings.price_below_market_threshold:
                    assessment = 'below_market'
                elif deviation > settings.price_above_market_threshold:
                    assessment = 'above_market'
                else:
                    assessment = 'at_market'

                service.update_prediction(
                    property_id=property_id,
                    predicted_price=predicted_price,
                    confidence=result['confidence'],
                    assessment=assessment,
                    deviation_percent=deviation * 100
                )
                updated += 1
            else:
                errors.append(f"Property {property_id} has no price")
                failed += 1

        except Exception as e:
            errors.append(f"Property {property_id}: {str(e)}")
            failed += 1

    return BatchPredictionResponse(
        updated_count=updated,
        failed_count=failed,
        errors=errors[:10]  # Limit errors returned
    )


@router.post("/predict-all", response_model=BatchPredictionResponse)
def predict_all_properties(db: Session = Depends(get_db)):
    """Run predictions for all properties without predictions."""
    from app.models.property import Property

    # Get all properties without predictions
    properties = db.query(Property).filter(
        Property.is_active == True,
        Property.predicted_price.is_(None),
        Property.price.isnot(None),
        Property.area_usable.isnot(None)
    ).all()

    property_ids = [p.id for p in properties]

    if not property_ids:
        return BatchPredictionResponse(
            updated_count=0,
            failed_count=0,
            errors=["No properties need predictions"]
        )

    return batch_predict(
        BatchPredictionRequest(property_ids=property_ids),
        db=db
    )
