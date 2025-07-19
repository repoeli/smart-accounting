# Smart Accounts Management System

A Django-based web application for income/expense management with OCR receipt processing, designed for self-employed individuals and small accounting firms in the UK.

## 🎯 Project Overview

This system streamlines financial record-keeping by automatically extracting data from receipts and invoices using OCR technology, providing real-time financial tracking, and generating UK tax-compliant reports.

### Target Users
- **Primary**: Self-employed individuals in the UK
- **Secondary**: Small accounting firms managing multiple clients

### Key Features
- 📄 **OCR Receipt Processing**: Automatic data extraction from receipts and invoices
- 💰 **Financial Tracking**: Real-time income and expense management
- 📊 **UK Tax Compliance**: VAT calculations and HMRC-compatible reporting
- 🏢 **Multi-tenant Support**: Accounting firms can manage multiple clients
- 💳 **Subscription Billing**: Tiered plans with Stripe integration
- 🔐 **Secure Authentication**: JWT-based auth with email verification

## 🛠 Technology Stack

- **Backend**: Django 4.2.16, Django REST Framework 3.16.0
- **Database**: PostgreSQL 17.5
- **OCR Engine**: Tesseract (via pytesseract 0.3.13)
- **Task Queue**: Celery with Redis
- **Payment Processing**: Stripe 12.3.0
- **Authentication**: JWT (djangorestframework_simplejwt 5.4.0)
- **Containerization**: Docker, Docker Compose
- **Python**: 3.11.9

## 📁 Project Structure

```
smart_accounting/
├── backend/                    # Django project root
│   ├── config/                # Project configuration
│   ├── apps/                  # Django applications
│   │   ├── users/             # User management & authentication
│   │   ├── clients/           # Client management (accounting firms)
│   │   ├── documents/         # Document storage & OCR processing
│   │   ├── transactions/      # Financial transaction management
│   │   ├── subscriptions/     # Stripe billing integration
│   │   └── reports/           # Financial reporting system
│   └── core/                  # Shared utilities and base classes
├── Documentation/             # Project documentation
│   ├── Implementation_Plan.md # Detailed implementation guide
│   ├── Django_Project_Structure.md # Django architecture
│   └── USER_STORIES.md       # User stories for development
├── docker-compose.yml        # Docker services configuration
└── requirements.txt          # Python dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.11.9
- Docker and Docker Compose
- PostgreSQL 17.5
- Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/repoeli/smart-accounting.git
   cd smart-accounting
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start services**
   ```bash
   docker-compose up --build
   ```

4. **Run migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

## 📋 Development Workflow

### Phase 1: Core Infrastructure (Weeks 1-3)
- [x] Project setup and documentation
- [ ] Django project foundation (Issue #7)
- [ ] User authentication system (Issue #5)
- [ ] Database models and migrations

### Phase 2: OCR & Document Processing (Weeks 4-6)
- [ ] Document upload system (Issue #6)
- [ ] OCR processing with Tesseract
- [ ] Transaction data extraction

### Phase 3: Financial Tracking & Reporting (Weeks 7-9)
- [ ] Transaction management
- [ ] Financial categorization
- [ ] Report generation

### Phase 4: Payment Integration (Weeks 10-12)
- [ ] Stripe subscription system
- [ ] Billing management
- [ ] Payment processing

### Current Status
✅ **Planning Complete**: ERD design, project structure, and user stories
✅ **Repository Setup**: GitHub repository with initial documentation
🔄 **Phase 1 Started**: Ready to begin Django development

## 📖 Documentation

- **[Implementation Plan](Documentation/Implementation_Plan.md)**: Comprehensive development roadmap
- **[Django Project Structure](Documentation/Django_Project_Structure.md)**: Detailed backend architecture
- **[User Stories](Documentation/USER_STORIES.md)**: Complete user stories for development
- **[GitHub Issues](https://github.com/repoeli/smart-accounting/issues)**: Track development progress

## 🔧 Key Features

### OCR Processing
- Tesseract-based text extraction
- UK receipt format optimization
- Confidence scoring and quality assessment
- Manual verification workflow

### Financial Management
- Income/expense categorization
- VAT rate detection and calculation
- Business vs personal expense separation
- 7-year data retention (HMRC compliance)

### Subscription Plans
- **Basic**: £9.99/month - 100 receipts, 1GB storage
- **Premium**: £19.99/month - 500 receipts, API access, bulk upload
- **Enterprise**: £49.99/month - Unlimited receipts, white-label, custom domain

### Security Features
- JWT-based authentication
- Email verification
- Password complexity requirements
- Secure file storage
- GDPR compliance

## 🤝 Contributing

1. Check the [GitHub Issues](https://github.com/repoeli/smart-accounting/issues) for current tasks
2. Follow the development phases outlined in the Implementation Plan
3. Create feature branches for new development
4. Submit pull requests for review

## 📄 License

This project is proprietary software developed for commercial use.

## 📞 Support

For questions about development or project planning, please create an issue in the GitHub repository.

---

**Smart Accounts Management System** - Streamlining financial management for UK businesses
