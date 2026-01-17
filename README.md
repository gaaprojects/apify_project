# Czech Real Estate Price Analyzer

A comprehensive system for scraping Czech real estate websites, analyzing prices with ML, and displaying results in a modern web interface.

## Architecture Overview

```
apify_project/
├── actors/                  # Apify web scraping actors
│   ├── sreality/           # Scraper for sreality.cz
│   ├── bezrealitky/        # Scraper for bezrealitky.cz
│   └── cuzk/               # Scraper for cuzk.gov.cz (cadastral)
├── backend/                 # FastAPI backend API
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   └── alembic/            # Database migrations
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
├── ml/                     # Machine learning model
│   ├── models/            # Trained models
│   ├── notebooks/         # Jupyter notebooks for analysis
│   └── src/               # Training and prediction code
├── database/              # Database scripts
│   └── init/              # Initialization scripts
└── docker/                # Docker configuration
```

## Data Sources

1. **sreality.cz** - Largest Czech real estate portal
2. **bezrealitky.cz** - Direct owner-to-buyer platform
3. **cuzk.gov.cz** - Official Czech cadastral office (property registry)

## Features

- Automated daily scraping of property listings
- ML-based price prediction (above/below/at market)
- Search and filter properties by location, type, price
- Price trend analysis
- Map visualization of properties

## Tech Stack

- **Scraping**: Apify actors (Node.js/Playwright)
- **Database**: PostgreSQL
- **Backend**: FastAPI (Python)
- **Frontend**: Next.js 14 (React)
- **ML**: XGBoost/Random Forest (scikit-learn)
- **Deployment**: Docker Compose

## Getting Started

See individual component READMEs for setup instructions.
