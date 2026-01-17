from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from geoalchemy2.functions import ST_X, ST_Y, ST_DWithin, ST_MakePoint, ST_SetSRID
from typing import Optional, List, Tuple
from decimal import Decimal
from datetime import datetime, timedelta

from app.models.property import Property, PriceHistory
from app.schemas.property import (
    PropertyCreate, PropertyUpdate, PropertyFilter, PropertyResponse,
    PropertyMapItem, Coordinates
)


class PropertyService:
    def __init__(self, db: Session):
        self.db = db

    def get_property(self, property_id: int) -> Optional[Property]:
        return self.db.query(Property).filter(Property.id == property_id).first()

    def get_property_by_external_id(self, external_id: str, source: str) -> Optional[Property]:
        return self.db.query(Property).filter(
            Property.external_id == external_id,
            Property.source == source
        ).first()

    def get_properties(
        self,
        filters: PropertyFilter,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "scraped_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Property], int]:
        query = self.db.query(Property).filter(Property.is_active == True)

        # Apply filters
        if filters.source:
            query = query.filter(Property.source == filters.source)
        if filters.property_type:
            query = query.filter(Property.property_type == filters.property_type)
        if filters.transaction_type:
            query = query.filter(Property.transaction_type == filters.transaction_type)
        if filters.city:
            query = query.filter(Property.address_city.ilike(f"%{filters.city}%"))
        if filters.price_min:
            query = query.filter(Property.price >= filters.price_min)
        if filters.price_max:
            query = query.filter(Property.price <= filters.price_max)
        if filters.area_min:
            query = query.filter(Property.area_usable >= filters.area_min)
        if filters.area_max:
            query = query.filter(Property.area_usable <= filters.area_max)
        if filters.rooms:
            query = query.filter(Property.rooms == filters.rooms)
        if filters.price_assessment:
            query = query.filter(Property.price_assessment == filters.price_assessment)
        if filters.has_balcony is not None:
            query = query.filter(Property.has_balcony == filters.has_balcony)
        if filters.has_parking is not None:
            query = query.filter(Property.has_parking == filters.has_parking)
        if filters.has_elevator is not None:
            query = query.filter(Property.has_elevator == filters.has_elevator)

        # Get total count
        total = query.count()

        # Apply sorting
        sort_column = getattr(Property, sort_by, Property.scraped_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        offset = (page - 1) * page_size
        properties = query.offset(offset).limit(page_size).all()

        return properties, total

    def get_properties_in_bounds(
        self,
        south: float,
        west: float,
        north: float,
        east: float,
        filters: Optional[PropertyFilter] = None,
        limit: int = 500
    ) -> List[PropertyMapItem]:
        query = self.db.query(
            Property.id,
            ST_Y(Property.coordinates).label('lat'),
            ST_X(Property.coordinates).label('lng'),
            Property.price,
            Property.price_assessment,
            Property.property_type,
            Property.rooms,
            Property.area_usable,
            Property.main_image_url
        ).filter(
            Property.is_active == True,
            Property.coordinates.isnot(None)
        )

        # Filter by bounding box
        query = query.filter(
            func.ST_Within(
                Property.coordinates,
                func.ST_MakeEnvelope(west, south, east, north, 4326)
            )
        )

        # Apply additional filters if provided
        if filters:
            if filters.property_type:
                query = query.filter(Property.property_type == filters.property_type)
            if filters.transaction_type:
                query = query.filter(Property.transaction_type == filters.transaction_type)
            if filters.price_min:
                query = query.filter(Property.price >= filters.price_min)
            if filters.price_max:
                query = query.filter(Property.price <= filters.price_max)
            if filters.price_assessment:
                query = query.filter(Property.price_assessment == filters.price_assessment)

        results = query.limit(limit).all()

        return [
            PropertyMapItem(
                id=r.id,
                lat=r.lat,
                lng=r.lng,
                price=r.price,
                price_assessment=r.price_assessment,
                property_type=r.property_type,
                rooms=r.rooms,
                area_usable=r.area_usable,
                main_image_url=r.main_image_url
            )
            for r in results
        ]

    def get_similar_properties(
        self,
        property_id: int,
        radius_km: float = 5.0,
        limit: int = 10
    ) -> List[Property]:
        property = self.get_property(property_id)
        if not property or not property.coordinates:
            return []

        query = self.db.query(Property).filter(
            Property.id != property_id,
            Property.is_active == True,
            Property.coordinates.isnot(None),
            Property.property_type == property.property_type,
            Property.transaction_type == property.transaction_type,
            ST_DWithin(
                Property.coordinates,
                property.coordinates,
                radius_km * 1000  # Convert to meters
            )
        )

        # Filter by similar area (±30%)
        if property.area_usable:
            area_min = float(property.area_usable) * 0.7
            area_max = float(property.area_usable) * 1.3
            query = query.filter(
                Property.area_usable.between(area_min, area_max)
            )

        # Filter by same room count if available
        if property.rooms:
            query = query.filter(Property.rooms == property.rooms)

        return query.limit(limit).all()

    def create_property(self, property_data: PropertyCreate) -> Property:
        # Check if property already exists
        existing = self.get_property_by_external_id(
            property_data.external_id,
            property_data.source
        )
        if existing:
            return self.update_property_from_create(existing, property_data)

        # Create coordinates point if lat/lng provided
        coordinates = None
        if property_data.lat and property_data.lng:
            coordinates = func.ST_SetSRID(
                func.ST_MakePoint(property_data.lng, property_data.lat),
                4326
            )

        # Calculate price per sqm
        price_per_sqm = None
        if property_data.price and property_data.area_usable:
            price_per_sqm = property_data.price / property_data.area_usable

        property_dict = property_data.model_dump(exclude={'lat', 'lng'})
        property_dict['coordinates'] = coordinates
        property_dict['price_per_sqm'] = price_per_sqm

        db_property = Property(**property_dict)
        self.db.add(db_property)
        self.db.commit()
        self.db.refresh(db_property)

        # Record initial price in history
        if property_data.price:
            self.add_price_history(db_property.id, property_data.price)

        return db_property

    def update_property_from_create(
        self,
        existing: Property,
        property_data: PropertyCreate
    ) -> Property:
        # Check if price changed
        if property_data.price and existing.price != property_data.price:
            self.add_price_history(existing.id, property_data.price)

        # Update fields
        for key, value in property_data.model_dump(exclude={'lat', 'lng'}).items():
            if value is not None:
                setattr(existing, key, value)

        # Update coordinates if provided
        if property_data.lat and property_data.lng:
            existing.coordinates = func.ST_SetSRID(
                func.ST_MakePoint(property_data.lng, property_data.lat),
                4326
            )

        # Recalculate price per sqm
        if existing.price and existing.area_usable:
            existing.price_per_sqm = existing.price / existing.area_usable

        existing.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(existing)

        return existing

    def update_property(
        self,
        property_id: int,
        property_data: PropertyUpdate
    ) -> Optional[Property]:
        property = self.get_property(property_id)
        if not property:
            return None

        for key, value in property_data.model_dump(exclude_unset=True).items():
            setattr(property, key, value)

        self.db.commit()
        self.db.refresh(property)
        return property

    def add_price_history(self, property_id: int, price: Decimal):
        history = PriceHistory(property_id=property_id, price=price)
        self.db.add(history)
        self.db.commit()

    def get_price_history(self, property_id: int) -> List[PriceHistory]:
        return self.db.query(PriceHistory).filter(
            PriceHistory.property_id == property_id
        ).order_by(PriceHistory.recorded_at.desc()).all()

    def update_prediction(
        self,
        property_id: int,
        predicted_price: float,
        confidence: float,
        assessment: str,
        deviation_percent: float
    ):
        property = self.get_property(property_id)
        if property:
            property.predicted_price = predicted_price
            property.prediction_confidence = confidence
            property.price_assessment = assessment
            property.price_deviation_percent = deviation_percent
            property.predicted_at = datetime.utcnow()
            self.db.commit()

    def get_price_trends(
        self,
        city: Optional[str] = None,
        property_type: Optional[str] = None,
        days: int = 90
    ) -> List[dict]:
        start_date = datetime.utcnow() - timedelta(days=days)

        query = self.db.query(
            func.date_trunc('day', Property.scraped_at).label('date'),
            func.avg(Property.price).label('avg_price'),
            func.avg(Property.price_per_sqm).label('avg_price_per_sqm'),
            func.count(Property.id).label('count')
        ).filter(
            Property.is_active == True,
            Property.scraped_at >= start_date
        )

        if city:
            query = query.filter(Property.address_city.ilike(f"%{city}%"))
        if property_type:
            query = query.filter(Property.property_type == property_type)

        results = query.group_by(
            func.date_trunc('day', Property.scraped_at)
        ).order_by('date').all()

        return [
            {
                'date': r.date.strftime('%Y-%m-%d'),
                'avg_price': float(r.avg_price) if r.avg_price else 0,
                'avg_price_per_sqm': float(r.avg_price_per_sqm) if r.avg_price_per_sqm else 0,
                'count': r.count
            }
            for r in results
        ]

    def get_market_overview(self) -> dict:
        base_query = self.db.query(Property).filter(Property.is_active == True)

        total = base_query.count()
        avg_price = self.db.query(func.avg(Property.price)).filter(
            Property.is_active == True
        ).scalar() or 0
        avg_price_per_sqm = self.db.query(func.avg(Property.price_per_sqm)).filter(
            Property.is_active == True
        ).scalar() or 0

        below_market = base_query.filter(
            Property.price_assessment == 'below_market'
        ).count()
        at_market = base_query.filter(
            Property.price_assessment == 'at_market'
        ).count()
        above_market = base_query.filter(
            Property.price_assessment == 'above_market'
        ).count()

        # By city
        by_city = {}
        city_stats = self.db.query(
            Property.address_city,
            func.count(Property.id).label('count'),
            func.avg(Property.price).label('avg_price')
        ).filter(
            Property.is_active == True
        ).group_by(Property.address_city).all()

        for stat in city_stats:
            if stat.address_city:
                by_city[stat.address_city] = {
                    'count': stat.count,
                    'avg_price': float(stat.avg_price) if stat.avg_price else 0
                }

        # By property type
        by_property_type = {}
        type_stats = self.db.query(
            Property.property_type,
            func.count(Property.id).label('count'),
            func.avg(Property.price).label('avg_price')
        ).filter(
            Property.is_active == True
        ).group_by(Property.property_type).all()

        for stat in type_stats:
            if stat.property_type:
                by_property_type[stat.property_type] = {
                    'count': stat.count,
                    'avg_price': float(stat.avg_price) if stat.avg_price else 0
                }

        return {
            'total_properties': total,
            'avg_price': float(avg_price),
            'avg_price_per_sqm': float(avg_price_per_sqm),
            'below_market_count': below_market,
            'at_market_count': at_market,
            'above_market_count': above_market,
            'by_city': by_city,
            'by_property_type': by_property_type
        }

    def get_heatmap_data(
        self,
        city: Optional[str] = None,
        grid_size: float = 0.01  # ~1km grid
    ) -> List[dict]:
        query = self.db.query(
            func.round(func.cast(ST_Y(Property.coordinates), Decimal) / grid_size) * grid_size,
            func.round(func.cast(ST_X(Property.coordinates), Decimal) / grid_size) * grid_size,
            func.avg(Property.price_per_sqm).label('intensity')
        ).filter(
            Property.is_active == True,
            Property.coordinates.isnot(None),
            Property.price_per_sqm.isnot(None)
        )

        if city:
            query = query.filter(Property.address_city.ilike(f"%{city}%"))

        results = query.group_by(
            func.round(func.cast(ST_Y(Property.coordinates), Decimal) / grid_size) * grid_size,
            func.round(func.cast(ST_X(Property.coordinates), Decimal) / grid_size) * grid_size
        ).all()

        # Normalize intensity values
        if results:
            max_intensity = max(r.intensity for r in results if r.intensity)
            return [
                {
                    'lat': float(r[0]) if r[0] else 0,
                    'lng': float(r[1]) if r[1] else 0,
                    'intensity': float(r.intensity / max_intensity) if r.intensity and max_intensity else 0
                }
                for r in results
            ]
        return []

    @staticmethod
    def property_to_response(property: Property) -> PropertyResponse:
        coordinates = None
        if property.coordinates:
            # Extract lat/lng from geometry
            from sqlalchemy import func
            # This would typically be done in the query, but for conversion:
            coordinates = Coordinates(
                lat=0,  # Would need to extract from geometry
                lng=0
            )

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
