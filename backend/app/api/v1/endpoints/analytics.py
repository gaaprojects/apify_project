from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.services.property_service import PropertyService
from app.schemas.property import AnalyticsPriceTrend, MarketOverview, HeatmapData

router = APIRouter()


@router.get("/price-trends", response_model=List[AnalyticsPriceTrend])
def get_price_trends(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db)
):
    """Get price trends over time."""
    service = PropertyService(db)
    trends = service.get_price_trends(
        city=city,
        property_type=property_type,
        days=days
    )

    return [
        AnalyticsPriceTrend(
            date=t['date'],
            avg_price=t['avg_price'],
            avg_price_per_sqm=t['avg_price_per_sqm'],
            count=t['count']
        )
        for t in trends
    ]


@router.get("/market-overview", response_model=MarketOverview)
def get_market_overview(db: Session = Depends(get_db)):
    """Get overall market statistics."""
    service = PropertyService(db)
    return service.get_market_overview()


@router.get("/heatmap", response_model=List[HeatmapData])
def get_heatmap_data(
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get price heatmap data for visualization."""
    service = PropertyService(db)
    data = service.get_heatmap_data(city=city)

    return [
        HeatmapData(lat=d['lat'], lng=d['lng'], intensity=d['intensity'])
        for d in data
    ]


@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    """Get list of cities with property counts."""
    from app.models.property import Property
    from sqlalchemy import func

    results = db.query(
        Property.address_city,
        func.count(Property.id).label('count')
    ).filter(
        Property.is_active == True,
        Property.address_city.isnot(None)
    ).group_by(
        Property.address_city
    ).order_by(
        func.count(Property.id).desc()
    ).all()

    return [
        {"city": r.address_city, "count": r.count}
        for r in results
    ]


@router.get("/room-distribution")
def get_room_distribution(
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get distribution of room types."""
    from app.models.property import Property
    from sqlalchemy import func

    query = db.query(
        Property.rooms,
        func.count(Property.id).label('count'),
        func.avg(Property.price).label('avg_price')
    ).filter(
        Property.is_active == True,
        Property.rooms.isnot(None)
    )

    if city:
        query = query.filter(Property.address_city.ilike(f"%{city}%"))

    results = query.group_by(Property.rooms).order_by(Property.rooms).all()

    return [
        {
            "rooms": r.rooms,
            "count": r.count,
            "avg_price": float(r.avg_price) if r.avg_price else 0
        }
        for r in results
    ]


@router.get("/assessment-distribution")
def get_assessment_distribution(
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get distribution of price assessments."""
    from app.models.property import Property
    from sqlalchemy import func

    query = db.query(
        Property.price_assessment,
        func.count(Property.id).label('count')
    ).filter(
        Property.is_active == True,
        Property.price_assessment.isnot(None)
    )

    if city:
        query = query.filter(Property.address_city.ilike(f"%{city}%"))

    results = query.group_by(Property.price_assessment).all()

    return [
        {"assessment": r.price_assessment, "count": r.count}
        for r in results
    ]
