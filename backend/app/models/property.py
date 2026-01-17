from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
from app.database import Base


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), nullable=False)
    source = Column(String(50), nullable=False)

    # Basic info
    title = Column(String(500))
    description = Column(Text)
    property_type = Column(String(50))
    transaction_type = Column(String(50))
    price = Column(Numeric(15, 2))
    price_per_sqm = Column(Numeric(10, 2))
    currency = Column(String(10), default="CZK")

    # Size and layout
    area_usable = Column(Numeric(10, 2))
    area_built = Column(Numeric(10, 2))
    area_land = Column(Numeric(10, 2))
    rooms = Column(String(20))
    rooms_count = Column(Numeric(3, 1))
    floor = Column(Integer)
    floors_total = Column(Integer)

    # Features
    condition = Column(String(50))
    construction_type = Column(String(50))
    energy_rating = Column(String(10))
    has_balcony = Column(Boolean, default=False)
    has_terrace = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    has_garage = Column(Boolean, default=False)
    has_elevator = Column(Boolean, default=False)
    has_cellar = Column(Boolean, default=False)
    has_garden = Column(Boolean, default=False)

    # Location
    address_street = Column(String(255))
    address_city = Column(String(255))
    address_district = Column(String(255))
    address_zip = Column(String(20))
    address_country = Column(String(100), default="Czech Republic")
    coordinates = Column(Geometry("POINT", srid=4326))
    distance_to_center = Column(Numeric(10, 2))

    # ML predictions
    predicted_price = Column(Numeric(15, 2))
    price_assessment = Column(String(20))
    price_deviation_percent = Column(Numeric(5, 2))
    prediction_confidence = Column(Numeric(5, 4))
    predicted_at = Column(DateTime(timezone=True))

    # Cadastral data
    cadastral_number = Column(String(50))
    cadastral_area = Column(String(255))
    ownership_type = Column(String(100))
    liens_count = Column(Integer, default=0)
    encumbrances = Column(Text)
    historical_prices = Column(JSON)

    # Media
    images = Column(JSON)
    main_image_url = Column(String(1000))
    virtual_tour_url = Column(String(1000))

    # Metadata
    url = Column(String(1000))
    scraped_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    price_history = relationship("PriceHistory", back_populates="property", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"))
    price = Column(Numeric(15, 2), nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    property = relationship("Property", back_populates="price_history")


class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)
    status = Column(String(20), default="running")
    properties_found = Column(Integer, default=0)
    properties_new = Column(Integer, default=0)
    properties_updated = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    model_type = Column(String(50))
    metrics = Column(JSON)
    feature_importance = Column(JSON)
    trained_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_active = Column(Boolean, default=False)
    model_path = Column(String(500))


class CityCenter(Base):
    __tablename__ = "city_centers"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String(100), nullable=False, unique=True)
    coordinates = Column(Geometry("POINT", srid=4326), nullable=False)
