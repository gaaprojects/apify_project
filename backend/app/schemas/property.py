from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"


class TransactionType(str, Enum):
    SALE = "sale"
    RENT = "rent"


class PriceAssessment(str, Enum):
    BELOW_MARKET = "below_market"
    AT_MARKET = "at_market"
    ABOVE_MARKET = "above_market"


class Source(str, Enum):
    SREALITY = "sreality"
    BEZREALITKY = "bezrealitky"


class Coordinates(BaseModel):
    lat: float
    lng: float


class PropertyBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[str] = None
    transaction_type: Optional[str] = None
    price: Optional[Decimal] = None
    price_per_sqm: Optional[Decimal] = None
    currency: str = "CZK"

    area_usable: Optional[Decimal] = None
    area_built: Optional[Decimal] = None
    area_land: Optional[Decimal] = None
    rooms: Optional[str] = None
    rooms_count: Optional[Decimal] = None
    floor: Optional[int] = None
    floors_total: Optional[int] = None

    condition: Optional[str] = None
    construction_type: Optional[str] = None
    energy_rating: Optional[str] = None
    has_balcony: bool = False
    has_terrace: bool = False
    has_parking: bool = False
    has_garage: bool = False
    has_elevator: bool = False
    has_cellar: bool = False
    has_garden: bool = False

    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_zip: Optional[str] = None


class PropertyCreate(PropertyBase):
    external_id: str
    source: str
    url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    images: Optional[List[str]] = None
    main_image_url: Optional[str] = None


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class PropertyResponse(PropertyBase):
    id: int
    external_id: str
    source: str

    coordinates: Optional[Coordinates] = None
    distance_to_center: Optional[Decimal] = None

    predicted_price: Optional[Decimal] = None
    price_assessment: Optional[str] = None
    price_deviation_percent: Optional[Decimal] = None
    prediction_confidence: Optional[Decimal] = None

    cadastral_number: Optional[str] = None
    liens_count: int = 0

    images: Optional[List[str]] = None
    main_image_url: Optional[str] = None
    url: Optional[str] = None

    scraped_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class PropertyListResponse(BaseModel):
    items: List[PropertyResponse]
    total: int
    page: int
    page_size: int
    pages: int


class PropertyMapItem(BaseModel):
    id: int
    lat: float
    lng: float
    price: Optional[Decimal] = None
    price_assessment: Optional[str] = None
    property_type: Optional[str] = None
    rooms: Optional[str] = None
    area_usable: Optional[Decimal] = None
    main_image_url: Optional[str] = None


class PropertyMapResponse(BaseModel):
    items: List[PropertyMapItem]
    total: int


class PropertyFilter(BaseModel):
    source: Optional[str] = None
    property_type: Optional[str] = None
    transaction_type: Optional[str] = None
    city: Optional[str] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    area_min: Optional[Decimal] = None
    area_max: Optional[Decimal] = None
    rooms: Optional[str] = None
    price_assessment: Optional[str] = None
    has_balcony: Optional[bool] = None
    has_parking: Optional[bool] = None
    has_elevator: Optional[bool] = None


class PriceHistoryResponse(BaseModel):
    property_id: int
    price: Decimal
    recorded_at: datetime

    class Config:
        from_attributes = True


class PredictionRequest(BaseModel):
    property_type: str
    transaction_type: str = "sale"
    area_usable: float
    rooms_count: float
    floor: Optional[int] = None
    floors_total: Optional[int] = None
    condition: Optional[str] = None
    construction_type: Optional[str] = None
    energy_rating: Optional[str] = None
    city: str
    has_balcony: bool = False
    has_terrace: bool = False
    has_parking: bool = False
    has_elevator: bool = False
    has_cellar: bool = False
    distance_to_center: Optional[float] = None


class PredictionResponse(BaseModel):
    predicted_price: float
    confidence: float
    price_per_sqm: float
    comparable_properties: int


class BatchPredictionRequest(BaseModel):
    property_ids: List[int]


class BatchPredictionResponse(BaseModel):
    updated_count: int
    failed_count: int
    errors: List[str] = []


class AnalyticsPriceTrend(BaseModel):
    date: str
    avg_price: float
    avg_price_per_sqm: float
    count: int


class MarketOverview(BaseModel):
    total_properties: int
    avg_price: float
    avg_price_per_sqm: float
    below_market_count: int
    at_market_count: int
    above_market_count: int
    by_city: dict
    by_property_type: dict


class HeatmapData(BaseModel):
    lat: float
    lng: float
    intensity: float
