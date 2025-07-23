@echo off
echo === Smart Accounting Local Development Setup ===

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed. Please install Python 3.11+
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Set up environment variables
if not exist .env (
    echo Creating .env file...
    (
    echo DEBUG=True
    echo SECRET_KEY=your-secret-key-here
    echo DATABASE_URL=sqlite:///db.sqlite3
    echo OPENAI_API_KEY=your-openai-api-key
    echo REDIS_URL=redis://localhost:6379/0
    ) > .env
)

REM Run migrations
echo Running database migrations...
python manage.py migrate

REM Collect static files
echo Collecting static files...
python manage.py collectstatic --noinput

echo.
echo === Setup Complete ===
echo To start the development server:
echo   cd backend
echo   python manage.py runserver
echo.
echo The API will be available at: http://localhost:8000
echo Admin interface: http://localhost:8000/admin
echo.
pause
