# Smart Accounts Management System - Implementation Plan

## 1. Project Overview

### 1.1 Project Summary
The Smart Accounts Management System is a full-stack web application designed to streamline income/expense management, automate record-keeping, and simplify tax compliance for self-employed individuals and small accounting firms in the UK. The system will use modern technologies including OCR for receipt data extraction, secure PDF storage, and financial reporting capabilities.

### 1.2 Target Users
- **Primary**: Self-employed individuals in the UK
- **Secondary**: Small accounting firms managing multiple clients

### 1.3 Technology Stack
- **Backend**: Django 4.2.16, Django REST Framework 3.16.0
- **Database**: PostgreSQL 17.5
- **Frontend**: React (separate application with mobile-responsive design)
- **Deployment**: AWS with £100/month budget constraint
- **OCR Engine**: Tesseract (via pytesseract 0.3.13)
- **PDF Processing**: pdf2image 1.17.0, pikepdf 9.9.0, img2pdf 0.6.1
- **Authentication**: JWT (djangorestframework_simplejwt 5.4.0)
- **Task Queue**: Celery with Redis
- **Payment Processing**: Stripe 12.3.0
- **Container**: Docker, Docker Compose
- **Python Version**: 3.11.9

## 2. System Architecture

### 2.1 High-Level Architecture
The system will follow a microservice-oriented architecture with the following components:
- **Web Application Service**: Django-based backend API
- **Database Service**: PostgreSQL for data persistence
- **Redis Service**: For caching and message brokering
- **Celery Workers**: For background and scheduled tasks
- **Celery Beat**: For scheduled tasks
- **Flower**: For monitoring Celery tasks

### 2.2 Data Flow
1. User uploads receipt images through web interface
2. Images are processed by the OCR engine in background Celery tasks
3. Extracted data is stored in PostgreSQL database
4. Users can view, categorize, and manage their financial data
5. System generates reports and insights based on stored data
6. Subscription management through Stripe integration

## 3. Feature Breakdown

### 3.1 Core Features

#### 3.1.1 User Authentication and Authorization
- Secure registration and login system
- Role-based access control (individual users vs. accounting firms)
- Multi-tenant architecture for accounting firms to manage multiple clients
- JWT-based authentication for API security

#### 3.1.2 Receipt Capture & Processing
- Mobile-friendly receipt image upload
- OCR data extraction using Tesseract
- Extraction of key data points:
  - Vendor/company name
  - Date of transaction
  - Total amount
  - VAT/tax information
  - Item descriptions (when possible)
- Manual validation and correction of extracted data
- Receipt categorization (income vs. expense)
- Business vs. personal expense tagging

#### 3.1.3 Document Management
- Conversion of images to optimized PDF format
- Secure storage with appropriate encryption
- Organizing documents by date, category, and type
- Search functionality across all stored documents
- Batch operations for multiple documents

#### 3.1.4 Financial Tracking
- Dashboard for financial overview
- Income and expense categorization
- Real-time financial summaries
- Category-based analysis
- Date range filtering
- Tax calculation assistance

#### 3.1.5 Reporting
- Monthly/quarterly/annual financial reports
- Tax period-specific reports
- Customizable report templates
- Export to multiple formats (CSV, PDF, Excel)
- Data visualization and charts

#### 3.1.6 Payment Integration
- Stripe integration for subscription management
- Tiered subscription models:
  - Individual plans (Basic, Premium)
  - Enterprise plans for accounting firms
- Secure payment processing
- Subscription management interface
- Payment history and receipts

### 3.2 Additional Features

#### 3.2.1 Notification System
- Email notifications for key events
- In-app alerts and reminders
- Tax deadline reminders
- Subscription renewal notifications

#### 3.2.2 Accounting Firm Specific Features
- Client management dashboard
- Batch processing of client documents
- Client-specific reporting
- Collaborative tools for working with clients

#### 3.2.3 API Integration Capabilities
- API endpoints for integration with other accounting software
- Webhook support for real-time data updates


## 4. Deployment Steps

### 4.1 Docker Compose & Environment Variables
- Use `docker-compose.yml` to orchestrate services (web, db, redis, celery, flower).
- Store secrets and config in `.env` (never commit real secrets).
- Example commands:
  ```sh
  docker-compose up --build
  docker-compose exec backend python manage.py migrate
  docker-compose exec backend python manage.py createsuperuser
  ```

### 4.2 AWS Deployment (Basic)
- Use AWS EC2 or ECS for hosting containers.
- Use AWS RDS for managed PostgreSQL.
- Use AWS S3 for document storage (receipts, reports).
- Set up environment variables for production secrets.
- Use AWS Secrets Manager or SSM Parameter Store for sensitive data.

### 4.3 Environment Variables Example
```
DJANGO_SECRET_KEY=your-secret
DATABASE_URL=postgres://user:pass@db:5432/dbname
REDIS_URL=redis://redis:6379/0
STRIPE_API_KEY=sk_live_...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 5. Security Considerations

- Use Argon2 or bcrypt for password hashing (never store plain passwords).
- Enforce strong password policies and email verification.
- Use JWT for authentication; set short expiry for access tokens, use refresh tokens.
- Enable HTTPS everywhere (use AWS ACM or Let's Encrypt).
- Rate limit login and sensitive endpoints (e.g., via Django Ratelimit).
- Store sensitive files (receipts, reports) in S3 with private ACLs.
- Regularly update dependencies and monitor for vulnerabilities.
- Ensure GDPR compliance (data export, deletion, privacy policy).

## 6. CI/CD Pipeline

- Use GitHub Actions for:
  - Automated testing on PRs and main branch
  - Linting and code formatting checks
  - Docker image build and push
  - Deployment to AWS (ECS, EC2, or Elastic Beanstalk)
- Example workflow files: `.github/workflows/test.yml`, `.github/workflows/deploy.yml`
- Use Dependabot for automated dependency updates.

## 7. API Documentation

- Use Django REST Framework's built-in schema generation (drf-yasg or drf-spectacular) to auto-generate OpenAPI/Swagger docs.
- Expose docs at `/api/docs/` or `/swagger/`.
- Optionally, provide a Postman collection for external integrators.

---

## 8. Database Design

### 4.1 Detailed Entity Tables Design

#### 4.1.1 Users Table
**Purpose**: Central authentication and user management for both individual users and accounting firms.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (user_type IN ('individual', 'accounting_firm')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Data Type Rationales:**
- `UUID`: More secure than auto-incrementing integers, prevents enumeration attacks, globally unique
- `VARCHAR(255)` for email: Standard length for email addresses per RFC specifications
- `VARCHAR(255)` for password_hash: Accommodates bcrypt, Argon2, or other modern hashing algorithms
- `VARCHAR(100)` for names: Sufficient for most real-world names while preventing excessive storage
- `CHECK` constraint: Ensures data integrity at database level for user types
- `TIMESTAMP`: Provides timezone-aware date/time storage for audit trails

**Indexing Strategy:**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type_active ON users(user_type, is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Index Rationales:**
- Unique email index: Fast authentication lookups and prevents duplicate accounts
- Composite index on type+active: Efficient queries for active users by type
- Created_at index: Supports user registration analytics and chronological queries

#### 4.1.2 Clients Table
**Purpose**: Manages client relationships for accounting firms in multi-tenant architecture.

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    tax_reference VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Data Type Rationales:**
- `UUID` for foreign key: Maintains consistency with users table design
- `CASCADE DELETE`: When accounting firm is deleted, their clients are automatically removed
- `VARCHAR(200)` for client_name: Accommodates company names and full personal names
- `VARCHAR(50)` for tax_reference: UK tax references (UTR, NINO) are typically 10-13 characters
- Optional email/phone: Not all clients may provide contact information initially

**Indexing Strategy:**
```sql
CREATE INDEX idx_clients_accounting_firm ON clients(accounting_firm_id);
CREATE INDEX idx_clients_tax_ref ON clients(tax_reference) WHERE tax_reference IS NOT NULL;
CREATE INDEX idx_clients_name_search ON clients USING gin(to_tsvector('english', client_name));
```

**Index Rationales:**
- Accounting firm index: Fast retrieval of all clients for a specific firm
- Partial index on tax_reference: Only indexes non-null values, saves space
- Full-text search index: Enables efficient client name searching

#### 4.1.3 Categories Table
**Purpose**: Standardized categorization system for income and expenses with UK tax compliance.

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    tax_deductible BOOLEAN DEFAULT false,
    vat_rate DECIMAL(4,2) DEFAULT 0.00
);
```

**Data Type Rationales:**
- `VARCHAR(100)` for name: Sufficient for category names like "Office Supplies", "Professional Services"
- `CHECK` constraint on type: Ensures only valid income/expense types
- `TEXT` for description: Allows detailed explanations for complex categories
- `DECIMAL(4,2)` for VAT rate: Precise storage for percentages (0.00 to 99.99%)
- Boolean flags: Quick filtering for default categories and tax-deductible items

**Indexing Strategy:**
```sql
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_default ON categories(is_default) WHERE is_default = true;
```

**Index Rationales:**
- Type index: Separate income/expense category lookups
- Partial index on defaults: Quick access to system default categories

#### 4.1.4 Documents Table
**Purpose**: Secure storage and metadata management for receipt/invoice documents with OCR tracking.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size <= 10485760), -- 10MB limit
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf', 'image/heic')),
    file_hash VARCHAR(64), -- SHA-256 hash for integrity
    ocr_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    ocr_confidence DECIMAL(5,2), -- 0.00 to 100.00 percentage
    ocr_text TEXT,
    needs_review BOOLEAN NOT NULL DEFAULT false, -- Auto-flagged when confidence < 85%
    is_reviewed BOOLEAN NOT NULL DEFAULT false, -- Manual review completed
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    retention_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'), -- 7-year retention
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);
```

**Data Type Rationales:**
- `VARCHAR(500)` for file_path: Accommodates deep directory structures and long filenames
- `BIGINT` for file_size: Supports files up to 9 exabytes (future-proof)
- `VARCHAR(64)` for file_hash: SHA-256 produces 64-character hex strings
- `DECIMAL(5,2)` for confidence: Stores percentages with precision (0.00 to 999.99)
- `TEXT` for OCR text: Unlimited storage for extracted text content
- Separate processed_at: Tracks when OCR processing completed

**Indexing Strategy:**
```sql
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_client_id ON documents(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_documents_ocr_status ON documents(ocr_status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);
CREATE INDEX idx_documents_text_search ON documents USING gin(to_tsvector('english', ocr_text)) WHERE ocr_text IS NOT NULL;
```

**Index Rationales:**
- User/client indexes: Fast document retrieval by ownership
- OCR status index: Monitor processing queues and failed documents
- File hash index: Duplicate detection and integrity verification
- Full-text search: Search within extracted OCR text content

#### 4.1.5 Transactions Table
**Purpose**: Core financial data extracted from documents with comprehensive UK tax fields.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    vendor_name VARCHAR(200),
    amount DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2),
    vat_amount DECIMAL(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP', -- GBP only for now
    transaction_date DATE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    is_business BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    invoice_number VARCHAR(100),
    payment_method VARCHAR(50),
    retention_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'), -- 7-year retention
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id)
);
```

**Data Type Rationales:**
- `DECIMAL(15,2)`: Precise monetary calculations, supports up to £999,999,999,999.99
- Separate net/VAT amounts: Essential for UK tax compliance and VAT returns
- `VARCHAR(3)` for currency: ISO 4217 standard currency codes
- `DATE` for transaction_date: Business logic doesn't require time precision
- `VARCHAR(100)` for invoice_number: Accommodates various invoice numbering systems
- Verification tracking: Audit trail for manual validation process

**Indexing Strategy:**
```sql
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_transactions_date_type ON transactions(transaction_date, type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_business ON transactions(is_business, type) WHERE is_business = true;
CREATE INDEX idx_transactions_amount ON transactions(amount DESC);
CREATE INDEX idx_transactions_verification ON transactions(is_verified, verified_at);
```

**Index Rationales:**
- Date+type composite: Fast filtering for income/expense reports by period
- Business transactions: Quick access to business-only expenses for tax purposes
- Amount descending: Efficient queries for largest transactions
- Verification index: Audit reports and unverified transaction tracking

#### 4.1.6 Subscriptions Table
**Purpose**: Stripe integration for subscription billing with comprehensive status tracking.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(100) UNIQUE,
    stripe_customer_id VARCHAR(100),
    plan_name VARCHAR(50) NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_end TIMESTAMP,
    canceled_at TIMESTAMP,
    has_api_access BOOLEAN NOT NULL DEFAULT false, -- API access feature flag
    has_white_label BOOLEAN NOT NULL DEFAULT false, -- White-label branding feature
    max_concurrent_ocr INTEGER NOT NULL DEFAULT 5, -- OCR processing limits
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Data Type Rationales:**
- `VARCHAR(100)` for Stripe IDs: Accommodates Stripe's ID format with growth buffer
- `DECIMAL(10,2)` for price: Sufficient for subscription pricing (up to £99,999,999.99)
- Comprehensive status tracking: Matches Stripe's subscription lifecycle
- Multiple timestamp fields: Detailed subscription lifecycle management
- Billing cycle constraint: Enforces valid billing periods

**Indexing Strategy:**
```sql
CREATE UNIQUE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
```

**Index Rationales:**
- Unique Stripe ID: Fast webhook processing and prevents duplicates
- User+status composite: Quick subscription status lookups
- Period end index: Efficient renewal processing for active subscriptions

#### 4.1.7 Reports Table
**Purpose**: Generated financial reports with caching and audit trails.

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom', 'vat_return', 'profit_loss', 'expense_summary')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'CSV', 'Excel', 'JSON')),
    parameters JSONB, -- Store report generation parameters
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    generated_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Data Type Rationales:**
- Comprehensive report types: Covers all UK business reporting needs
- `JSONB` for parameters: Flexible storage for complex report configurations with indexing support
- File metadata: Track generated files for cleanup and storage management
- Expiration tracking: Automated cleanup of temporary/cached reports
- Status tracking: Monitor report generation queue

**Indexing Strategy:**
```sql
CREATE INDEX idx_reports_user_period ON reports(user_id, period_start, period_end);
CREATE INDEX idx_reports_type_status ON reports(report_type, status);
CREATE INDEX idx_reports_expires ON reports(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_reports_parameters ON reports USING gin(parameters) WHERE parameters IS NOT NULL;
```

**Index Rationales:**
- User+period composite: Fast retrieval of reports for specific periods
- Type+status: Monitor report generation by type
- Expiration index: Efficient cleanup of expired reports
- JSONB GIN index: Complex queries on report parameters

#### 4.1.8 API Tokens Table
**Purpose**: External API access management with rate limiting and usage tracking.

```sql
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of actual token
    is_active BOOLEAN NOT NULL DEFAULT true,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    allowed_scopes JSONB NOT NULL DEFAULT '["read"]', -- Scopes: read, write, admin
    last_used_at TIMESTAMP,
    usage_count BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexing Strategy:**
```sql
CREATE UNIQUE INDEX idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_user_active ON api_tokens(user_id, is_active);
CREATE INDEX idx_api_tokens_expires ON api_tokens(expires_at) WHERE expires_at IS NOT NULL;
```

#### 4.1.9 White Label Branding Table
**Purpose**: Enterprise white-label branding customization.

```sql
CREATE TABLE whitelabel_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) NOT NULL DEFAULT '#007bff',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#6c757d',
    custom_domain VARCHAR(255),
    custom_css TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexing Strategy:**
```sql
CREATE UNIQUE INDEX idx_whitelabel_user ON whitelabel_branding(user_id);
CREATE UNIQUE INDEX idx_whitelabel_domain ON whitelabel_branding(custom_domain) WHERE custom_domain IS NOT NULL;
```

#### 4.1.10 Bulk Upload Jobs Table
**Purpose**: Track bulk upload operations and their processing status.

```sql
CREATE TABLE bulk_upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_name VARCHAR(200),
    total_files INTEGER NOT NULL,
    processed_files INTEGER NOT NULL DEFAULT 0,
    successful_files INTEGER NOT NULL DEFAULT 0,
    failed_files INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    error_details JSONB,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

**Indexing Strategy:**
```sql
CREATE INDEX idx_bulk_jobs_user_status ON bulk_upload_jobs(user_id, status);
CREATE INDEX idx_bulk_jobs_started ON bulk_upload_jobs(started_at);
```

### 4.2 Database Design Principles & Advanced Considerations

#### 4.2.1 Security & Compliance
- **UUID Primary Keys**: Prevents enumeration attacks and provides global uniqueness
- **Foreign Key Constraints**: Ensures referential integrity
- **CHECK Constraints**: Data validation at database level
- **Audit Trails**: Comprehensive timestamp tracking for GDPR compliance
- **Cascade Rules**: Careful consideration of data relationships during deletions

#### 4.2.2 Performance Optimization
- **Strategic Indexing**: Covering common query patterns without over-indexing
- **Partial Indexes**: Space-efficient indexing for sparse data
- **Composite Indexes**: Optimized for multi-column WHERE clauses
- **GIN Indexes**: Full-text search capabilities for documents and clients

#### 4.2.3 Data Integrity
- **Constraint Validation**: Preventing invalid data at database level
- **Referential Integrity**: Proper foreign key relationships
- **Business Rules**: Encoded as database constraints where appropriate
- **Data Types**: Chosen for accuracy, performance, and storage efficiency

#### 4.2.4 Scalability Considerations
- **Partitioning Strategy**: Transactions table can be partitioned by date
- **Archival Strategy**: Older documents and transactions can be moved to separate tables
- **Connection Pooling**: PostgreSQL configuration for high concurrency
- **Read Replicas**: Reporting queries can be offloaded to read-only replicas

## 5. Implementation Phases

This section outlines the development timeline, broken down into six distinct phases. Each phase consists of weekly sprints focused on specific feature sets. For detailed, actionable tasks, please refer to the [USER_STORIES.md](./USER_STORIES.md) document, which is designed to be used for creating and tracking GitHub Issues.

### 5.1 Phase 1: Core Infrastructure (Weeks 1-3)

#### 5.1.1 Project Setup and Structure
**Week 1: Django Project Foundation**
- Set up Django project with recommended folder structure
- Configure environment-specific settings (development, production, testing)
- Implement base models and abstract classes in `core/`
- Set up Docker containerization with separate backend/frontend containers
- Configure Celery and Redis integration
- Set up basic logging and monitoring

**Django Apps to Create:**
```bash
# Core infrastructure apps
apps/users/          # User authentication and management
apps/clients/        # Client management for accounting firms
apps/documents/      # Document storage and OCR processing
apps/transactions/   # Financial transaction management
apps/subscriptions/  # Stripe billing integration
apps/reports/        # Financial reporting system
apps/notifications/  # Email and notification system
```

**Week 2: Authentication and User Management**
- Implement custom User model with JWT authentication
- Create user registration and login endpoints
- Set up role-based permissions (individual vs accounting_firm)
- Implement multi-tenant architecture for accounting firms
- Add user profile management
- Create comprehensive user tests

**Week 3: Database and Core Models**
- Implement all database models based on ERD design
- Set up database migrations
- Create model managers and custom querysets
- Implement database indexing strategy
- Set up database backup and recovery procedures
- Create data fixtures for testing

#### 5.1.2 Development Environment Configuration

**Required Environment Variables:**
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@db:5432/smart_accounts
DATABASE_HOST=db
DATABASE_NAME=smart_accounts
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis Configuration
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Django Configuration
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# File Storage
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/static

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OCR Configuration
TESSERACT_CMD=/usr/bin/tesseract
```

**Docker Services Configuration:**
```yaml
# Enhanced docker-compose.yml structure
services:
  db:          # PostgreSQL 17.5
  redis:       # Redis 7-alpine for caching and Celery
  backend:     # Django application
  celery:      # Celery worker for background tasks
  celery-beat: # Celery scheduler for periodic tasks
  flower:      # Celery monitoring
  nginx:       # Reverse proxy (production)
  frontend:    # Frontend application (React/Vue.js)
```

### 5.2 Phase 2: OCR and Document Processing (Weeks 4-6)

#### 5.2.1 Document Management System
**Week 4: File Upload and Storage**
- Implement secure file upload endpoints
- Set up file storage with proper organization structure
- Create file validation and security checks
- Implement file deduplication using SHA-256 hashing
- Set up file cleanup and archival processes

**Document Services Architecture:**
```python
# apps/documents/services/
storage_service.py      # File storage and organization
ocr_service.py         # OCR processing with Tesseract
pdf_service.py         # PDF conversion and optimization
validation_service.py  # File validation and security
```

**Week 5: OCR Implementation**
- Integrate Tesseract OCR with image preprocessing
- Implement OCR confidence scoring and quality assessment
- Create background task processing with Celery
- Add support for multiple image formats (JPEG, PNG, PDF)
- Implement OCR result validation and correction interface

**OCR Processing Pipeline:**
```python
# OCR workflow implementation
1. File upload → security validation
2. Image preprocessing → noise reduction, contrast enhancement
3. OCR extraction → Tesseract processing
4. Data parsing → extract vendor, amount, date, VAT
5. Confidence scoring → quality assessment
6. Manual validation → user correction interface
7. Transaction creation → automatic categorization
```

**Week 6: Document Search and Management**
- Implement full-text search across OCR content
- Create document categorization and tagging system
- Add batch document processing capabilities
- Implement document version control
- Create document sharing for accounting firms and clients

#### 5.2.2 Advanced OCR Features
- **Multi-language support** for various receipt formats
- **Receipt template recognition** for common vendors
- **Auto-categorization** based on vendor patterns
- **VAT rate detection** for UK tax compliance
- **Currency detection** and conversion support

### 5.3 Phase 3: Financial Tracking & Reporting (Weeks 7-9)

#### 5.3.1 Transaction Management
**Week 7: Core Transaction System**
- Implement transaction CRUD operations
- Create category management with UK tax compliance
- Add transaction verification and approval workflow
- Implement transaction import/export functionality
- Create transaction reconciliation tools

**Transaction Services:**
```python
# apps/transactions/services/
transaction_service.py     # Core transaction logic
categorization_service.py  # Auto-categorization rules
reconciliation_service.py  # Bank reconciliation
tax_calculation_service.py # UK tax calculations
```

**Week 8: Financial Dashboard**
- Create real-time financial overview dashboard
- Implement income vs expense tracking
- Add cash flow analysis and projections
- Create category-based spending analysis
- Implement date range filtering and comparisons

**Week 9: Advanced Analytics**
- Implement business intelligence features
- Create trend analysis and forecasting
- Add expense pattern recognition
- Implement budget tracking and alerts
- Create financial health scoring system

#### 5.3.2 UK Tax Compliance Features
- **VAT calculation and tracking** for VAT-registered businesses
- **Business vs personal expense** separation
- **Tax-deductible expense** identification
- **HMRC-compatible reporting** formats
- **Annual tax summary** generation

### 5.4 Phase 4: Payment Integration & Subscriptions (Weeks 10-12)

#### 5.4.1 Stripe Integration
**Week 10: Subscription System**
- Integrate Stripe payment processing
- Implement tiered subscription models (Basic, Premium, Enterprise)
- Create subscription management interface
- Add payment method management
- Implement proration and billing cycle management

**Enhanced Subscription Plans with New Features:**
```python
# Updated subscription tier definitions
BASIC_PLAN = {
    'name': 'Basic',
    'price': 9.99,  # GBP per month
    'features': {
        'max_receipts_per_month': 100,
        'max_clients': 1,
        'storage_gb': 1,
        'basic_reports': True,
        'email_support': True,
        'api_access': False,
        'white_label': False,
        'bulk_upload': False,
        'max_concurrent_ocr': 3
    }
}

PREMIUM_PLAN = {
    'name': 'Premium', 
    'price': 19.99,  # GBP per month
    'features': {
        'max_receipts_per_month': 500,
        'max_clients': 5,
        'storage_gb': 5,
        'advanced_reports': True,
        'api_access': True,           # NEW: API access included
        'white_label': False,
        'bulk_upload': True,          # NEW: Bulk upload (up to 10 receipts)
        'priority_support': True,
        'max_concurrent_ocr': 8
    }
}

ENTERPRISE_PLAN = {
    'name': 'Enterprise',
    'price': 49.99,  # GBP per month  
    'features': {
        'unlimited_receipts': True,
        'unlimited_clients': True,
        'storage_gb': 50,
        'custom_reports': True,
        'api_access': True,           # Full API access with higher limits
        'white_label': True,          # NEW: Full white-label branding
        'bulk_upload': True,          # Bulk upload (up to 20 receipts)
        'dedicated_support': True,
        'max_concurrent_ocr': 20,
        'custom_domain': True,        # NEW: Custom domain support
        'priority_processing': True   # NEW: Priority OCR queue
    }
}
```

**Week 11: Payment Processing**
- Implement secure payment processing
- Add payment history and receipt generation
- Create invoice generation for subscriptions
- Implement failed payment handling and retry logic
- Add payment analytics and reporting

**Week 12: Billing Management**
- Create billing dashboard for users
- Implement subscription upgrades/downgrades
- Add usage tracking and billing alerts
- Create admin billing management interface
- Implement revenue reporting and analytics

#### 5.4.2 Webhook Integration
- **Stripe webhook handling** for real-time updates
- **Payment status synchronization**
- **Subscription lifecycle management**
- **Dunning management** for failed payments

### 5.5 Phase 5: Testing & Optimization (Weeks 13-14)

#### 5.5.1 Comprehensive Testing Strategy
**Week 13: Testing Implementation**
- Unit tests for all models and services (target: 95% coverage)
- Integration tests for API endpoints
- End-to-end tests for critical user workflows
- Performance testing for OCR processing
- Security testing and penetration testing

**Testing Structure:**
```python
# Testing framework implementation
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for workflows
├── api/           # API endpoint testing
├── performance/   # Load and performance tests
└── security/      # Security and vulnerability tests
```

**Week 14: Performance Optimization**
- Database query optimization and indexing
- Celery task optimization for OCR processing
- API response time optimization
- File storage and retrieval optimization
- Memory usage optimization for large documents

#### 5.5.2 Quality Assurance
- **Code review process** implementation
- **Automated testing pipeline** with CI/CD
- **Performance monitoring** setup
- **Error tracking and logging** enhancement
- **Security audit** and compliance check

### 5.6 Phase 6: Deployment & Launch (Weeks 15-16)

#### 5.6.1 Production Environment Setup
**Week 15: Infrastructure Deployment**
- Set up production environment (AWS/GCP/Azure)
- Configure production database with replication
- Set up Redis cluster for high availability
- Implement CDN for static file delivery
- Configure SSL certificates and security headers

**Production Architecture:**
```yaml
# Production deployment structure
Load Balancer (Nginx/CloudFlare)
├── Web Servers (Django + Gunicorn)
├── Database (PostgreSQL with read replicas)
├── Cache Layer (Redis Cluster)
├── Task Queue (Celery workers)
├── File Storage (AWS S3/CloudFlare R2)
└── Monitoring (Prometheus/Grafana)
```

**Week 16: Launch Preparation**
- Final security audit and penetration testing
- Performance testing under load
- Backup and disaster recovery testing
- User acceptance testing with beta users
- Documentation finalization and team training

#### 5.6.2 Monitoring and Maintenance
- **Application Performance Monitoring** (APM)
- **Log aggregation and analysis**
- **Database performance monitoring**
- **Automated backup verification**
- **Security monitoring and alerting**

## 6. Technical Considerations

### 6.1 Performance Requirements & Targets

#### 6.1.1 MVP Performance Baseline
Based on your requirements, the MVP should handle:

**Concurrent User Load:**
- **Target Concurrent Users**: 100
- **Peak Load**: 200 concurrent users
- **API Throughput**: 500 requests/minute
- **OCR Processing**: 20 jobs/minute

**OCR Processing Targets:**
- **Single Receipt**: ≤ 5 seconds
- **Batch OCR (10 receipts)**: ≤ 40 seconds
- **Error Retry (3 attempts)**: ≤ 15 seconds total

**Storage Requirements:**
- **Monthly Storage per User**: 6-30 MB
- **Annual Storage per User**: ~360 MB (with 7-year retention)
- **File Size Limit**: 10 MB per receipt upload

#### 6.1.2 Production Performance Targets
Long-term production goals:

**Scaled User Load:**
- **Target Concurrent Users**: 1,000+
- **Peak Load**: 3,000+ concurrent users
- **API Throughput**: 5,000 requests/minute
- **OCR Processing**: 100+ jobs/minute

**Optimized OCR Performance:**
- **Single Receipt**: ≤ 2 seconds
- **Batch OCR (10 receipts)**: ≤ 15 seconds
- **Error Retry**: ≤ 5 seconds total

### 6.2 OCR Configuration & Quality Standards

#### 6.2.1 OCR Quality Thresholds
Based on your business requirements:

```python
# OCR confidence scoring configuration
OCR_CONFIDENCE_SETTINGS = {
    'MINIMUM_ACCEPTABLE': 70,    # Fields below 70% are rejected
    'NEEDS_REVIEW_THRESHOLD': 85,  # Fields 70-85% flagged for review
    'AUTO_APPROVE_THRESHOLD': 85,  # Fields above 85% auto-approved
    'BATCH_CONFIDENCE_MIN': 75,    # Minimum average for batch processing
}

# File processing settings
FILE_PROCESSING_SETTINGS = {
    'MAX_FILE_SIZE': 10 * 1024 * 1024,  # 10MB limit
    'SUPPORTED_FORMATS': ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'],
    'OUTPUT_FORMAT': 'application/pdf',  # All converted to PDF
    'COMPRESSION_QUALITY': 85,           # Balance quality vs size
}
```

#### 6.2.2 Data Retention Policy Implementation
7-year retention policy with automated cleanup:

```python
# Data retention configuration
RETENTION_POLICIES = {
    'FINANCIAL_DATA': {'years': 7, 'policy': 'HMRC_COMPLIANCE'},
    'USER_ACCOUNT_DATA': {'years': 7, 'after_deletion': True},
    'PAYMENT_RECORDS': {'indefinite': True, 'anonymize_after': 7},
    'ERROR_LOGS': {'days': 30},
    'AUDIT_LOGS': {'years': 1},
    'COMPLIANCE_FRAMEWORK': ['HMRC', 'GDPR', 'UK_DPA_2018']
}

# Scheduled cleanup tasks
@periodic_task(run_every=crontab(hour=2, minute=0))  # Daily at 2 AM
def cleanup_expired_data():
    """Automated data retention cleanup"""
    cleanup_service = DataRetentionService()
    cleanup_service.process_expired_documents()
    cleanup_service.anonymize_old_payment_records()
    cleanup_service.delete_old_error_logs()
```

### 6.3 AWS Deployment Strategy (£100/month Budget)

#### 6.3.1 Cost-Optimized AWS Architecture
Designed for your £100/month budget constraint:

```yaml
# AWS services allocation for £100/month budget
AWS_SERVICES:
  compute:
    - service: "EC2 t3.medium"
      cost: "£35/month"
      purpose: "Django application server"
    - service: "EC2 t3.small" 
      cost: "£18/month"
      purpose: "Celery workers"
  
  database:
    - service: "RDS PostgreSQL t3.micro"
      cost: "£20/month"
      purpose: "Primary database"
  
  storage:
    - service: "S3 Standard"
      cost: "£8/month"
      purpose: "Document storage (estimated 50GB)"
  
  cache:
    - service: "ElastiCache Redis t3.micro"
      cost: "£15/month"
      purpose: "Celery broker and caching"
  
  total_estimated: "£96/month"
  buffer: "£4/month for data transfer and misc"
```

#### 6.3.2 Scaling Strategy Within Budget
Progressive scaling approach:

**Phase 1 (MVP - Months 1-6):**
- Single EC2 instance with Docker Compose
- RDS PostgreSQL (single instance)
- S3 for file storage
- ElastiCache Redis (single node)

**Phase 2 (Growth - Months 6-12):**
- Load balancer + 2x EC2 instances
- RDS with read replica
- CloudFront CDN for static files
- Multi-AZ Redis setup

### 6.4 Django Project Architecture

#### 6.4.1 Enhanced Project Structure for New Features
The Django backend follows a modular, scalable architecture with clear separation of concerns:

**Enhanced Core Applications:**
- **`apps/users/`**: Authentication, user management, and multi-tenant support
- **`apps/clients/`**: Client management for accounting firms
- **`apps/documents/`**: Document storage, OCR processing, and file management (with bulk upload)
- **`apps/transactions/`**: Financial transaction processing and categorization
- **`apps/subscriptions/`**: Stripe integration and billing management
- **`apps/reports/`**: Financial reporting and export functionality
- **`apps/notifications/`**: Email and notification system
- **`apps/api/`**: External API access for third-party integrations
- **`apps/whitelabel/`**: White-label branding customization

**Shared Infrastructure:**
- **`core/`**: Shared utilities, base models, and common functionality
- **`config/`**: Environment-specific settings and configuration
- **`requirements/`**: Environment-specific dependency management

#### 6.1.2 Service Layer Architecture
Each Django app implements a service layer pattern for business logic separation:

```python
# Enhanced service layer structure with new features
apps/documents/services/
├── ocr_service.py          # OCR processing with confidence thresholds
├── pdf_service.py          # PDF conversion and optimization
├── storage_service.py      # File storage and organization
├── validation_service.py   # Document validation and security
├── bulk_service.py         # Bulk upload and processing
└── retention_service.py    # Data retention and cleanup

apps/api/services/
├── auth_service.py         # API authentication (JWT/OAuth2)
├── rate_limiter.py         # API rate limiting by subscription
└── webhook_service.py      # Webhook management

apps/whitelabel/services/
├── branding_service.py     # Custom branding management
├── domain_service.py       # Custom domain handling
└── css_service.py          # Dynamic CSS generation
```

**Benefits of Service Layer:**
- **Testability**: Business logic can be tested independently
- **Reusability**: Services can be used across multiple views/endpoints
- **Maintainability**: Complex logic is organized and documented
- **Scalability**: Services can be extracted to microservices later

#### 6.1.3 API Design Strategy with External Access
Enhanced RESTful API design with external integration support:

```python
# Enhanced API endpoint structure
/api/v1/
├── auth/                    # Authentication endpoints
│   ├── login/
│   ├── logout/
│   ├── register/
│   ├── refresh/
│   └── api-keys/           # API key management for external access
├── users/                   # User management
│   ├── profile/
│   ├── settings/
│   └── clients/            # Nested client management
├── documents/              # Document management
│   ├── upload/
│   ├── bulk-upload/        # Bulk upload endpoint (1-20 receipts)
│   ├── {id}/process/       # OCR processing
│   ├── {id}/download/
│   ├── search/
│   └── batch-process/      # Batch OCR processing
├── transactions/           # Financial transactions
│   ├── categories/
│   ├── import/
│   ├── export/
│   └── reconcile/
├── subscriptions/          # Billing management
│   ├── plans/
│   ├── payment-methods/
│   ├── billing-history/
│   └── features/           # Feature flags per subscription
├── reports/               # Financial reporting
│   ├── generate/
│   ├── templates/
│   └── export/
├── api/                   # External API management
│   ├── tokens/            # API token management
│   ├── usage/             # API usage statistics
│   └── webhooks/          # Webhook configuration
└── whitelabel/           # White-label customization
    ├── branding/         # Logo, colors, CSS
    ├── domains/          # Custom domain setup
    └── settings/         # White-label configuration
```

#### 6.1.4 Bulk Operations Implementation
Support for bulk receipt upload and processing:

```python
# Bulk processing service
class BulkDocumentService:
    MAX_BULK_SIZE = 20  # Maximum 20 receipts per batch
    
    def process_bulk_upload(self, files, user):
        """Process multiple receipt uploads simultaneously"""
        results = []
        
        # Validate bulk upload constraints
        if len(files) > self.MAX_BULK_SIZE:
            raise ValidationError(f"Maximum {self.MAX_BULK_SIZE} files allowed")
        
        # Create document records
        documents = []
        for file in files:
            document = self.create_document_record(file, user)
            documents.append(document)
        
        # Queue OCR processing tasks in parallel
        ocr_tasks = []
        for document in documents:
            task = process_document_ocr.delay(document.id)
            ocr_tasks.append(task)
        
        # Return bulk processing job ID
        return {
            'job_id': str(uuid4()),
            'documents': [doc.id for doc in documents],
            'tasks': [task.id for task in ocr_tasks],
            'status': 'processing',
            'total_files': len(files)
        }
```

#### 6.1.5 White-Label Implementation
Enterprise white-label branding support:

```python
# White-label branding model
class WhiteLabelBranding(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=200)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default='#007bff')  # Hex color
    secondary_color = models.CharField(max_length=7, default='#6c757d')
    custom_domain = models.CharField(max_length=255, blank=True)
    custom_css = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)
    
    def generate_custom_css(self):
        """Generate CSS based on branding settings"""
        return f"""
        :root {{
            --primary-color: {self.primary_color};
            --secondary-color: {self.secondary_color};
            --company-name: '{self.company_name}';
        }}
        
        .navbar-brand::before {{
            content: var(--company-name);
        }}
        
        .btn-primary {{
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }}
        """
```

#### 6.1.6 Database Integration Strategy
- **Custom Model Managers**: For complex queries and business logic
- **Database Migrations**: Version-controlled schema changes
- **Indexing Strategy**: Performance optimization for large datasets
- **Connection Pooling**: Efficient database connection management

### 6.5 Enhanced OCR Implementation Architecture

#### 6.5.1 OCR Processing Pipeline with Confidence Thresholds
Enhanced OCR implementation meeting your specific requirements:

```python
# OCR processor with confidence-based quality control
class EnhancedOCRProcessor:
    # Configuration based on your requirements
    CONFIDENCE_THRESHOLDS = {
        'MIN_ACCEPTABLE': 70,      # Below this: reject/retry
        'NEEDS_REVIEW': 85,        # 70-85%: flag for manual review
        'AUTO_APPROVE': 85,        # Above 85%: auto-approve
        'BATCH_MINIMUM': 75        # Minimum average for batch processing
    }
    
    PROCESSING_TARGETS = {
        'SINGLE_RECEIPT_MAX': 5,   # seconds
        'BATCH_10_MAX': 40,        # seconds for 10 receipts
        'RETRY_MAX': 15            # seconds total for 3 retries
    }
    
    def process_document(self, document):
        """Enhanced OCR processing with confidence scoring"""
        start_time = time.time()
        
        try:
            # Stage 1: Image Preprocessing (optimized for speed)
            processed_image = self.preprocess_image_fast(document.file)
            
            # Stage 2: Primary OCR with Tesseract
            ocr_result = self.tesseract_ocr_enhanced(processed_image)
            
            # Stage 3: Confidence Assessment
            confidence_score = self.calculate_multi_factor_confidence(ocr_result)
            
            # Stage 4: Quality-based processing decision
            processing_result = self.process_by_confidence(ocr_result, confidence_score)
            
            # Stage 5: Update document status based on confidence
            self.update_document_status(document, processing_result, confidence_score)
            
            processing_time = time.time() - start_time
            
            return {
                'confidence': confidence_score,
                'processing_time': processing_time,
                'needs_review': confidence_score < self.CONFIDENCE_THRESHOLDS['NEEDS_REVIEW'],
                'auto_approved': confidence_score >= self.CONFIDENCE_THRESHOLDS['AUTO_APPROVE'],
                'extracted_data': processing_result.data if confidence_score >= 70 else None
            }
            
        except Exception as e:
            # Enhanced retry logic
            return self.handle_ocr_failure(document, e, start_time)
    
    def process_by_confidence(self, ocr_result, confidence):
        """Process OCR result based on confidence score"""
        if confidence < self.CONFIDENCE_THRESHOLDS['MIN_ACCEPTABLE']:
            # Below 70%: Schedule for retry with different preprocessing
            raise OCRQualityError(f"Confidence {confidence}% below minimum threshold")
        
        elif confidence < self.CONFIDENCE_THRESHOLDS['NEEDS_REVIEW']:
            # 70-85%: Extract data but flag for manual review
            return self.extract_data_with_review_flag(ocr_result)
        
        else:
            # 85%+: Auto-approve and extract data
            return self.extract_data_auto_approved(ocr_result)
```

#### 6.5.2 File Processing Optimization
Meeting your 10MB file size and format requirements:

```python
# File processing configuration
FILE_PROCESSING_CONFIG = {
    'MAX_SIZE_BYTES': 10 * 1024 * 1024,  # 10MB limit
    'SUPPORTED_FORMATS': {
        'image/jpeg': {'extension': '.jpg', 'compression': True},
        'image/png': {'extension': '.png', 'compression': True},
        'application/pdf': {'extension': '.pdf', 'multipage': True},
        'image/heic': {'extension': '.heic', 'convert_to': 'jpeg'}  # Optional HEIC support
    },
    'OUTPUT_FORMAT': 'application/pdf',
    'COMPRESSION_SETTINGS': {
        'quality': 85,
        'optimize': True,
        'progressive': True
    }
}

class FastImageProcessor:
    def preprocess_image_fast(self, image_file):
        """Optimized preprocessing for 5-second target"""
        # Fast preprocessing pipeline
        image = Image.open(image_file)
        
        # Quick size optimization
        if image.width > 2000 or image.height > 2000:
            image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
        
        # Fast contrast enhancement
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)
        
        # Quick noise reduction
        image = image.filter(ImageFilter.MedianFilter(size=3))
        
        return image
```

#### 6.5.3 Data Extraction Patterns (UK-Focused)
Optimized for UK receipt formats:

```python
# Enhanced UK receipt data extraction
UK_RECEIPT_PATTERNS = {
    'amounts': [
        r'(?:£|GBP|TOTAL|Total)\s*(\d+\.?\d{0,2})',
        r'(\d+\.\d{2})\s*(?:£|GBP)',
        r'(?:AMOUNT|Amount|BALANCE|Balance)[\s:]*£?(\d+\.?\d{0,2})'
    ],
    'dates': [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',           # DD/MM/YYYY
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})',
        r'(\d{2,4}[/-]\d{1,2}[/-]\d{1,2})'            # YYYY/MM/DD
    ],
    'vat': [
        r'(?:VAT|vat)\s*[@:]\s*(\d+(?:\.\d+)?%?)',     # VAT @ 20%
        r'(?:VAT|V\.A\.T\.)\s*(\d+\.?\d*)',            # VAT 4.25
        r'(\d+\.?\d*)%?\s*(?:VAT|vat)'                 # 20% VAT
    ],
    'vendors': [
        r'^([A-Z][A-Za-z\s&]+)(?:\n|$)',               # First line company name
        r'(?:Merchant|MERCHANT)[\s:]*([A-Za-z\s&]+)',  # Merchant: Name
    ]
}
```

#### 6.2.1 OCR Processing Pipeline
Enhanced OCR implementation with multiple processing stages:

```python
# OCR processing workflow
class OCRProcessor:
    def process_document(self, document):
        # Stage 1: Image Preprocessing
        processed_image = self.preprocess_image(document.file)
        
        # Stage 2: Primary OCR with Tesseract
        primary_text = self.tesseract_ocr(processed_image)
        
        # Stage 3: Secondary OCR with EasyOCR (fallback)
        secondary_text = self.easyocr_fallback(processed_image)
        
        # Stage 4: Text Processing and Validation
        validated_text = self.validate_and_combine(primary_text, secondary_text)
        
        # Stage 5: Data Extraction
        extracted_data = self.extract_financial_data(validated_text)
        
        # Stage 6: Confidence Scoring
        confidence_score = self.calculate_confidence(extracted_data)
        
        return OCRResult(
            text=validated_text,
            data=extracted_data,
            confidence=confidence_score
        )
```

**Image Preprocessing Steps:**
- **Noise Reduction**: Remove image artifacts and improve clarity
- **Contrast Enhancement**: Optimize text visibility
- **Rotation Correction**: Auto-detect and correct document orientation
- **Deskewing**: Straighten tilted documents
- **Resolution Optimization**: Scale images for optimal OCR performance

**Data Extraction Patterns:**
```python
# Regular expressions for UK receipt data
AMOUNT_PATTERNS = [
    r'(?:£|GBP)\s*(\d+\.?\d*)',           # £25.50 or GBP25.50
    r'(?:TOTAL|Total|total)[\s:]*£?(\d+\.?\d*)',  # Total: £25.50
    r'(\d+\.?\d*)\s*(?:£|GBP)',          # 25.50 £
]

DATE_PATTERNS = [
    r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # DD/MM/YYYY
    r'(\d{1,2}\s+\w+\s+\d{2,4})',        # 15 March 2024
]

VAT_PATTERNS = [
    r'(?:VAT|vat)\s*[\@:]\s*(\d+(?:\.\d+)?%?)',  # VAT @ 20%
    r'(?:VAT|vat)\s*(\d+\.?\d*)',                # VAT 4.25
]
```

#### 6.2.2 OCR Quality Assurance
- **Confidence Scoring**: Multi-factor confidence assessment
- **Manual Validation**: User interface for correcting OCR errors
- **Learning System**: Improve accuracy based on user corrections
- **Fallback Mechanisms**: Multiple OCR engines for better accuracy

### 6.3 Asynchronous Processing Enhancement

#### 6.3.1 Celery Task Organization
Structured approach to background task processing:

```python
# Celery task categories and priorities
HIGH_PRIORITY_TASKS = [
    'notifications.tasks.send_urgent_notification',
    'subscriptions.tasks.process_payment_webhook',
]

MEDIUM_PRIORITY_TASKS = [
    'documents.tasks.process_ocr',
    'reports.tasks.generate_monthly_report',
]

LOW_PRIORITY_TASKS = [
    'documents.tasks.cleanup_old_files',
    'reports.tasks.archive_old_reports',
]
```

**Task Implementation Example:**
```python
# apps/documents/tasks.py
from celery import shared_task
from .services.ocr_service import OCRService

@shared_task(bind=True, max_retries=3)
def process_document_ocr(self, document_id):
    try:
        document = Document.objects.get(id=document_id)
        ocr_service = OCRService()
        
        # Update status to processing
        document.ocr_status = 'processing'
        document.save()
        
        # Process OCR
        result = ocr_service.process_document(document)
        
        # Update document with results
        document.ocr_text = result.text
        document.ocr_confidence = result.confidence
        document.ocr_status = 'completed'
        document.processed_at = timezone.now()
        document.save()
        
        # Create transaction from extracted data
        if result.confidence > 0.8:
            transaction_service = TransactionService()
            transaction_service.create_from_ocr_data(document, result.data)
            
    except Exception as exc:
        document.ocr_status = 'failed'
        document.save()
        raise self.retry(exc=exc, countdown=60)
```

#### 6.3.2 Task Monitoring and Management
- **Flower Integration**: Real-time task monitoring
- **Task Retry Logic**: Intelligent retry strategies
- **Dead Letter Queues**: Handle permanently failed tasks
- **Task Prioritization**: Queue management for different task types

### 6.4 Security Implementation

#### 6.4.1 Authentication and Authorization
```python
# JWT-based authentication with custom permissions
class IsOwnerOrAccountingFirm(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Users can access their own objects
        if obj.user == request.user:
            return True
            
        # Accounting firms can access their clients' objects
        if (request.user.user_type == 'accounting_firm' and 
            hasattr(obj, 'client') and 
            obj.client.accounting_firm == request.user):
            return True
            
        return False
```

#### 6.4.2 File Security
- **Virus Scanning**: Scan uploaded files for malware
- **File Type Validation**: Strict file type and size limits
- **Secure Storage**: Encrypted file storage with access controls
- **SHA-256 Hashing**: File integrity verification

#### 6.4.3 Data Protection
- **Field-Level Encryption**: Sensitive data encryption at rest
- **GDPR Compliance**: Data retention and deletion policies
- **Audit Logging**: Track all data access and modifications
- **Rate Limiting**: API endpoint protection against abuse

### 6.5 Performance Optimization

#### 6.5.1 Database Optimization
```python
# Optimized querysets with select_related and prefetch_related
class TransactionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Transaction.objects.select_related(
            'user', 'category', 'document'
        ).prefetch_related(
            'document__client'
        ).filter(user=self.request.user)
```

#### 6.5.2 Caching Strategy
- **Redis Caching**: API response caching for frequently accessed data
- **Database Query Caching**: Expensive query result caching
- **File Caching**: OCR result caching to avoid reprocessing
- **CDN Integration**: Static file delivery optimization

#### 6.5.3 Scalability Considerations
- **Database Read Replicas**: Distribute read operations
- **Horizontal Scaling**: Multiple Django instances behind load balancer
- **Microservice Preparation**: Service layer ready for extraction
- **API Versioning**: Backward compatibility for future updates

### 6.2 PDF Processing
- Using pdf2image for converting PDFs to images for OCR processing
- Implementing pikepdf for PDF manipulation and optimization
- Using img2pdf for efficient image-to-PDF conversion
- Ensuring proper compression for storage efficiency

### 6.3 Asynchronous Processing
- Using Celery for handling resource-intensive tasks:
  - OCR processing
  - PDF conversion
  - Report generation
  - Email notifications
- Implementing Redis as message broker and result backend
- Using Celery Beat for scheduled tasks:
  - Periodic report generation
  - Subscription renewal checks
  - System maintenance tasks

### 6.4 Security Considerations
- Implementing JWT-based authentication
- Ensuring proper CSRF protection
- Implementing field-level encryption for sensitive data
- Setting up proper access control mechanisms
- Regular security audits and updates
- GDPR compliance measures

### 6.5 Scalability Considerations
- Horizontal scaling capabilities via Docker
- Database optimization for large datasets
- Caching strategies for improved performance
- Load balancing for production deployment

## 7. Testing Strategy

### 7.1 Unit Testing
- Test coverage for all core functionality
- Automated tests for API endpoints
- Database model testing

### 7.2 Integration Testing
- Testing interactions between different system components
- API integration testing
- Third-party service integration testing (Stripe, email)

### 7.3 Performance Testing
- Load testing for concurrent users
- Stress testing for system limits
- Optimization based on performance metrics

### 7.4 User Acceptance Testing
- Testing with representative user groups
- Gathering feedback for UI/UX improvements
- Validating business requirements

## 8. Deployment Strategy

### 8.1 Development Environment
- Local Docker-based development setup
- CI/CD pipeline for automated testing

### 8.2 Staging Environment
- Replica of production for final testing
- Data anonymization for testing with realistic data

### 8.3 Production Environment
- Scalable cloud infrastructure
- Automated backup systems
- Monitoring and alerting setup
- Disaster recovery plan

## 9. Maintenance and Support

### 9.1 Ongoing Maintenance
- Regular security updates
- Performance monitoring and optimization
- Feature updates based on user feedback

### 9.2 Support System
- Ticketing system for user issues
- Knowledge base for common questions
- User documentation and guides

## 10. Risk Assessment and Mitigation

### 10.1 Identified Risks
- OCR accuracy limitations
- Data security concerns
- Regulatory compliance challenges
- Integration with third-party services

### 10.2 Mitigation Strategies
- Implementing manual validation for OCR results
- Regular security audits and penetration testing
- Staying updated with UK financial regulations
- Building robust error handling for third-party services

## 12. Implementation Updates Based on Follow-Up Requirements

### 12.1 Database Model Enhancements

Based on your specific requirements, the following updates have been made to the database design:

#### 12.1.1 Enhanced Data Retention & Compliance
- **Added 7-year retention policy** to documents and transactions tables
- **Automated cleanup** with `retention_date` fields and scheduled Celery tasks
- **HMRC compliance** fields and constraints
- **GDPR compliance** with proper data anonymization strategies

#### 12.1.2 OCR Quality Control
- **Confidence thresholds**: 70% minimum, 85% auto-approval threshold
- **Review flags**: `needs_review` and `is_reviewed` fields in documents table
- **File size limits**: 10MB enforced at database level with CHECK constraint
- **Supported formats**: JPG, PNG, PDF, HEIC (optional) with MIME type validation

#### 12.1.3 New Feature Support
- **API tokens table**: External API access with rate limiting and scope control
- **White-label branding table**: Enterprise customization support
- **Bulk upload jobs table**: Track batch processing operations
- **Enhanced subscriptions**: Feature flags for API access, white-labeling, bulk operations

### 12.2 Performance & Infrastructure Updates

#### 12.2.1 AWS Architecture for £100/month Budget
- **Cost-optimized deployment** using EC2 t3.medium + t3.small instances
- **RDS PostgreSQL t3.micro** for cost-effective database hosting
- **S3 + ElastiCache Redis** for storage and caching within budget
- **Progressive scaling strategy** from MVP to production targets

#### 12.2.2 Performance Targets
- **MVP**: 100 concurrent users, 500 API requests/minute, 20 OCR jobs/minute
- **Production**: 1,000+ users, 5,000 API requests/minute, 100+ OCR jobs/minute
- **OCR Processing**: ≤5 seconds per receipt (MVP), ≤2 seconds (production)
- **Bulk processing**: ≤40 seconds for 10 receipts (MVP), ≤15 seconds (production)

### 12.3 Technology Stack Finalization

#### 12.3.1 Frontend Decision
- **React application** with separate backend/frontend architecture
- **Mobile-responsive design** for all device types
- **API-first approach** to support future mobile app development

#### 12.3.2 Feature Implementation Priorities
1. **Core MVP Features** (Weeks 1-12)
2. **API Access & Rate Limiting** (Week 13)
3. **Bulk Upload Operations** (Week 13)
4. **White-Label Branding** (Week 14)
5. **AWS Deployment** (Weeks 15-16)

### 12.4 Compliance & Security Enhancements

#### 12.4.1 Data Retention Policy
- **Financial data**: 7 years retention (HMRC compliance)
- **User accounts**: 7 years after deletion
- **Payment records**: Indefinite (anonymized after 7 years)
- **Error logs**: 30 days
- **Audit logs**: 1 year

#### 12.4.2 OCR Quality Assurance
- **Minimum 70% confidence** for data acceptance
- **85% threshold** for auto-approval vs manual review
- **Fallback processing** for failed OCR attempts
- **User correction interface** for low-confidence extractions

### 12.5 Next Steps & Recommendations

Based on your answers, the implementation plan is now fully aligned with your requirements. The system is designed to:

1. **Scale within budget** using cost-optimized AWS architecture
2. **Meet performance targets** for both MVP and production phases
3. **Support future expansion** with API access and white-label features
4. **Ensure compliance** with UK tax regulations and data protection laws
5. **Provide flexibility** for potential integrations without over-engineering

**Recommended next action**: Begin Phase 1 implementation with the enhanced Django project structure, starting with the core infrastructure and database models as defined in this updated plan.
This implementation plan outlines the approach for developing the Smart Accounts Management System. The project will be developed in phases, with a focus on creating a robust, secure, and user-friendly system that addresses the specific needs of self-employed individuals and accounting firms in the UK.

The system's success will be measured by its ability to:
- Reduce the administrative burden of receipt management
- Improve the accuracy of financial record-keeping
- Simplify tax compliance processes
- Provide valuable financial insights
- Facilitate collaboration between self-employed individuals and their accountants
