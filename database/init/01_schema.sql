-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Properties table with spatial support
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL,  -- 'sreality', 'bezrealitky'

    -- Basic info
    title VARCHAR(500),
    description TEXT,
    property_type VARCHAR(50),    -- 'apartment', 'house'
    transaction_type VARCHAR(50), -- 'sale', 'rent'
    price DECIMAL(15, 2),
    price_per_sqm DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'CZK',

    -- Size and layout
    area_usable DECIMAL(10, 2),
    area_built DECIMAL(10, 2),
    area_land DECIMAL(10, 2),
    rooms VARCHAR(20),            -- '2+kk', '3+1'
    rooms_count DECIMAL(3, 1),    -- numeric: 2.0, 3.0
    floor INTEGER,
    floors_total INTEGER,

    -- Features
    condition VARCHAR(50),        -- 'new', 'good', 'renovated', 'original'
    construction_type VARCHAR(50), -- 'brick', 'panel', 'wood'
    energy_rating VARCHAR(10),    -- 'A', 'B', 'C', etc.
    has_balcony BOOLEAN DEFAULT FALSE,
    has_terrace BOOLEAN DEFAULT FALSE,
    has_parking BOOLEAN DEFAULT FALSE,
    has_garage BOOLEAN DEFAULT FALSE,
    has_elevator BOOLEAN DEFAULT FALSE,
    has_cellar BOOLEAN DEFAULT FALSE,
    has_garden BOOLEAN DEFAULT FALSE,

    -- Location
    address_street VARCHAR(255),
    address_city VARCHAR(255),
    address_district VARCHAR(255),
    address_zip VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Czech Republic',
    coordinates GEOMETRY(POINT, 4326),
    distance_to_center DECIMAL(10, 2), -- km to city center

    -- ML predictions
    predicted_price DECIMAL(15, 2),
    price_assessment VARCHAR(20), -- 'below_market', 'at_market', 'above_market'
    price_deviation_percent DECIMAL(5, 2),
    prediction_confidence DECIMAL(5, 4),
    predicted_at TIMESTAMP WITH TIME ZONE,

    -- Cadastral data
    cadastral_number VARCHAR(50),
    cadastral_area VARCHAR(255),
    ownership_type VARCHAR(100),
    liens_count INTEGER DEFAULT 0,
    encumbrances TEXT,
    historical_prices JSONB,

    -- Media
    images JSONB,  -- Array of image URLs
    main_image_url VARCHAR(1000),
    virtual_tour_url VARCHAR(1000),

    -- Metadata
    url VARCHAR(1000),
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(external_id, source)
);

-- Indexes for common queries
CREATE INDEX idx_properties_coordinates ON properties USING GIST(coordinates);
CREATE INDEX idx_properties_source ON properties(source);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_transaction_type ON properties(transaction_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_city ON properties(address_city);
CREATE INDEX idx_properties_assessment ON properties(price_assessment);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_properties_scraped_at ON properties(scraped_at);

-- Price history for tracking changes
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    price DECIMAL(15, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_history_property ON price_history(property_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at);

-- Scraping jobs for tracking scraper runs
CREATE TABLE scraping_jobs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    properties_found INTEGER DEFAULT 0,
    properties_new INTEGER DEFAULT 0,
    properties_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- ML model metadata
CREATE TABLE ml_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50),  -- 'xgboost', 'random_forest'
    metrics JSONB,           -- R2, MAE, RMSE, etc.
    feature_importance JSONB,
    trained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT FALSE,
    model_path VARCHAR(500)
);

-- City centers for distance calculations
CREATE TABLE city_centers (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    coordinates GEOMETRY(POINT, 4326) NOT NULL
);

-- Insert Czech city centers
INSERT INTO city_centers (city_name, coordinates) VALUES
    ('Praha', ST_SetSRID(ST_MakePoint(14.4378, 50.0755), 4326)),
    ('Brno', ST_SetSRID(ST_MakePoint(16.6068, 49.1951), 4326)),
    ('Ostrava', ST_SetSRID(ST_MakePoint(18.2625, 49.8209), 4326)),
    ('Plzeň', ST_SetSRID(ST_MakePoint(13.3776, 49.7384), 4326));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to calculate distance to nearest city center
CREATE OR REPLACE FUNCTION calculate_distance_to_center(prop_coords GEOMETRY)
RETURNS DECIMAL AS $$
DECLARE
    min_distance DECIMAL;
BEGIN
    SELECT MIN(ST_Distance(prop_coords::geography, coordinates::geography) / 1000)
    INTO min_distance
    FROM city_centers;
    RETURN min_distance;
END;
$$ LANGUAGE plpgsql;

-- View for property statistics
CREATE VIEW property_stats AS
SELECT
    address_city,
    property_type,
    transaction_type,
    COUNT(*) as total_properties,
    AVG(price) as avg_price,
    AVG(price_per_sqm) as avg_price_per_sqm,
    AVG(area_usable) as avg_area,
    COUNT(CASE WHEN price_assessment = 'below_market' THEN 1 END) as below_market_count,
    COUNT(CASE WHEN price_assessment = 'at_market' THEN 1 END) as at_market_count,
    COUNT(CASE WHEN price_assessment = 'above_market' THEN 1 END) as above_market_count
FROM properties
WHERE is_active = TRUE
GROUP BY address_city, property_type, transaction_type;
