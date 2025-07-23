# British Receipt OCR Configuration
# ===============================
# Smart Accounting - Production Configuration for UK Receipt Processing

# Currency Settings (British Primary)
RECEIPT_CURRENCY_PRIMARY = "GBP"
OPENAI_COST_CURRENCY = "GBP"  # All costs displayed in British pounds

# British VAT Configuration
UK_VAT_RATES = {
    "standard": 0.20,     # 20% - Most goods and services
    "reduced": 0.05,      # 5% - Domestic fuel, children's car seats
    "zero": 0.00,         # 0% - Most food, books, children's clothes
    "exempt": None        # Exempt - Insurance, postage stamps
}

# UK Retailer Optimization
ENABLE_UK_RETAILER_OPTIMIZATION = True
UK_RETAILER_DETECTION = True

# Performance Configuration (Heroku Optimized)
RECEIPT_PROCESSING_MAX_THREADS = 3  # Heroku dyno limit
RECEIPT_CACHE_ENABLED = True
RECEIPT_CACHE_TTL = 3600  # 1 hour

# British Receipt Format Settings
UK_POSTCODE_VALIDATION = True
UK_CARD_VALIDATION = True
BRITISH_DATE_FORMAT = "DD/MM/YYYY"
BRITISH_TIME_FORMAT = "24h"

# Cost Optimization (British Focus)
ENABLE_RECEIPT_COST_TRACKING = True
MAX_COST_PER_RECEIPT_GBP = 0.50  # £0.50 maximum per receipt
COST_ALERT_THRESHOLD_GBP = 0.30   # Alert if cost exceeds £0.30

# British Business Categories
UK_BUSINESS_CATEGORIES = [
    "groceries",
    "meals_restaurants", 
    "travel_transport",
    "utilities_council_tax",
    "professional_services",
    "office_supplies",
    "retail_clothing",
    "fuel_petrol",
    "pharmacy_medical",
    "other"
]

# Quality Settings
RECEIPT_CONFIDENCE_THRESHOLD = 85  # Minimum confidence for auto-approval
ENABLE_MANUAL_REVIEW_QUEUE = True
VAT_COMPLIANCE_CHECK = True

# API Configuration
OPENAI_VISION_MODEL = "gpt-4o"
OPENAI_TIMEOUT_SECONDS = 45
OPENAI_MAX_RETRIES = 3

# British Receipt Schema Validation
ENFORCE_UK_RECEIPT_SCHEMA = True
REQUIRE_VAT_BREAKDOWN = True
REQUIRE_POSTCODE_IN_ADDRESS = False  # Optional but preferred

# Monitoring and Analytics
ENABLE_RECEIPT_ANALYTICS = True
TRACK_RETAILER_STATISTICS = True
EXPORT_BRITISH_TAX_REPORTS = True

# Environment-specific overrides
import os

if os.getenv("DYNO"):  # Heroku environment
    RECEIPT_PROCESSING_MAX_THREADS = 2
    RECEIPT_CACHE_TTL = 1800  # 30 minutes on Heroku
    MAX_COST_PER_RECEIPT_GBP = 0.40  # Slightly lower for cost control

if os.getenv("ENVIRONMENT") == "production":
    ENABLE_RECEIPT_COST_TRACKING = True
    COST_ALERT_THRESHOLD_GBP = 0.25  # Stricter in production
    RECEIPT_CONFIDENCE_THRESHOLD = 90  # Higher confidence required
