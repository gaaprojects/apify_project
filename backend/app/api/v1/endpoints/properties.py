from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_X, ST_Y
from typing import Optional
from decimal import Decimal

from app.database import get_db
from app.services.property_service import PropertyService
from app.schemas.property import (
    PropertyResponse, PropertyListResponse, PropertyMapResponse,
    PropertyFilter, PropertyCreate, PropertyUpdate, Coordinates
)

router = APIRouter()


@router.get("", response_model=PropertyListResponse)
def get_properties(
    source: Optional[str] = None,
    property_type: Optional[str] = None,
    transaction_type: Optional[str] = None,
    city: Optional[str] = None,
    price_min: Optional[Decimal] = None,
    price_max: Optional[Decimal] = None,
    area_min: Optional[Decimal] = None,
    area_max: Optional[Decimal] = None,
    rooms: Optional[str] = None,
    price_assessment: Optional[str] = None,
    has_balcony: Optional[bool] = None,
    has_parking: Optional[bool] = None,
    has_elevator: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = "scraped_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    service = PropertyService(db)
    filters = PropertyFilter(
        source=source,
        property_type=property_type,
        transaction_type=transaction_type,
        city=city,
        price_min=price_min,
        price_max=price_max,
        area_min=area_min,
        area_max=area_max,
        rooms=rooms,
        price_assessment=price_assessment,
        has_balcony=has_balcony,
        has_parking=has_parking,
        has_elevator=has_elevator
    )

    properties, total = service.get_properties(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    pages = (total + page_size - 1) // page_size

    # Convert to response with coordinates
    items = []
    for prop in properties:
        response = property_to_response_with_coords(prop, db)
        items.append(response)

    return PropertyListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/map", response_model=PropertyMapResponse)
def get_properties_for_map(
    south: float = Query(..., description="South bound latitude"),
    west: float = Query(..., description="West bound longitude"),
    north: float = Query(..., description="North bound latitude"),
    east: float = Query(..., description="East bound longitude"),
    property_type: Optional[str] = None,
    transaction_type: Optional[str] = None,
    price_min: Optional[Decimal] = None,
    price_max: Optional[Decimal] = None,
    price_assessment: Optional[str] = None,
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    service = PropertyService(db)
    filters = PropertyFilter(
        property_type=property_type,
        transaction_type=transaction_type,
        price_min=price_min,
        price_max=price_max,
        price_assessment=price_assessment
    )

    items = service.get_properties_in_bounds(
        south=south,
        west=west,
        north=north,
        east=east,
        filters=filters,
        limit=limit
    )

    return PropertyMapResponse(items=items, total=len(items))


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(property_id: int, db: Session = Depends(get_db)):
    service = PropertyService(db)
    property = service.get_property(property_id)

    if not property:
        raise HTTPException(status_code=404, detail="Property not found")

    return property_to_response_with_coords(property, db)


@router.get("/{property_id}/similar", response_model=list[PropertyResponse])
def get_similar_properties(
    property_id: int,
    radius_km: float = Query(5.0, ge=0.5, le=50),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    service = PropertyService(db)
    properties = service.get_similar_properties(
        property_id=property_id,
        radius_km=radius_km,
        limit=limit
    )

    return [property_to_response_with_coords(p, db) for p in properties]


@router.get("/{property_id}/price-history")
def get_price_history(property_id: int, db: Session = Depends(get_db)):
    service = PropertyService(db)
    property = service.get_property(property_id)

    if not property:
        raise HTTPException(status_code=404, detail="Property not found")

    history = service.get_price_history(property_id)
    return [
        {
            "price": float(h.price),
            "recorded_at": h.recorded_at.isoformat()
        }
        for h in history
    ]


@router.post("", response_model=PropertyResponse)
def create_property(property_data: PropertyCreate, db: Session = Depends(get_db)):
    service = PropertyService(db)
    property = service.create_property(property_data)
    return property_to_response_with_coords(property, db)


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    property_data: PropertyUpdate,
    db: Session = Depends(get_db)
):
    service = PropertyService(db)
    property = service.update_property(property_id, property_data)

    if not property:
        raise HTTPException(status_code=404, detail="Property not found")

    return property_to_response_with_coords(property, db)


def property_to_response_with_coords(property, db: Session) -> PropertyResponse:
    """Convert property model to response with coordinates extracted."""
    from app.models.property import Property

    coordinates = None
    if property.coordinates:
        # Query to extract lat/lng from geometry
        result = db.query(
            ST_Y(Property.coordinates).label('lat'),
            ST_X(Property.coordinates).label('lng')
        ).filter(Property.id == property.id).first()

        if result and result.lat and result.lng:
            coordinates = Coordinates(lat=result.lat, lng=result.lng)

    return PropertyResponse(
        id=property.id,
        external_id=property.external_id,
        source=property.source,
        title=property.title,
        description=property.description,
        property_type=property.property_type,
        transaction_type=property.transaction_type,
        price=property.price,
        price_per_sqm=property.price_per_sqm,
        currency=property.currency,
        area_usable=property.area_usable,
        area_built=property.area_built,
        area_land=property.area_land,
        rooms=property.rooms,
        rooms_count=property.rooms_count,
        floor=property.floor,
        floors_total=property.floors_total,
        condition=property.condition,
        construction_type=property.construction_type,
        energy_rating=property.energy_rating,
        has_balcony=property.has_balcony,
        has_terrace=property.has_terrace,
        has_parking=property.has_parking,
        has_garage=property.has_garage,
        has_elevator=property.has_elevator,
        has_cellar=property.has_cellar,
        has_garden=property.has_garden,
        address_street=property.address_street,
        address_city=property.address_city,
        address_district=property.address_district,
        address_zip=property.address_zip,
        coordinates=coordinates,
        distance_to_center=property.distance_to_center,
        predicted_price=property.predicted_price,
        price_assessment=property.price_assessment,
        price_deviation_percent=property.price_deviation_percent,
        prediction_confidence=property.prediction_confidence,
        cadastral_number=property.cadastral_number,
        liens_count=property.liens_count or 0,
        images=property.images,
        main_image_url=property.main_image_url,
        url=property.url,
        scraped_at=property.scraped_at,
        updated_at=property.updated_at,
        is_active=property.is_active
    )
