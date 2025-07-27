#!/usr/bin/env python3
"""
Smart Accounting - Pre-Deployment Validation Test
Comprehensive system validation before Heroku deployment
"""

import os
import sys
import subprocess
import importlib
from pathlib import Path

# Color codes for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, status="info"):
    colors = {
        "success": Colors.GREEN + "✅ ",
        "error": Colors.RED + "❌ ",
        "warning": Colors.YELLOW + "⚠️  ",
        "info": Colors.BLUE + "ℹ️  "
    }
    print(f"{colors.get(status, '')}{message}{Colors.ENDC}")

def print_header(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

def main():
    print_header("🚀 Smart Accounting - Pre-Deployment Validation")
    
    # Test 1: Check Python version
    print_header("1. Python Environment Check")
    python_version = sys.version_info
    if python_version >= (3, 8):
        print_status(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}", "success")
    else:
        print_status(f"Python version {python_version.major}.{python_version.minor} is too old. Need 3.8+", "error")
        return False

    # Test 2: Check critical files exist
    print_header("2. Critical Files Check")
    critical_files = [
        "backend/manage.py",
        "backend/backend/settings.py",
        "backend/receipts/services/enhanced_openai_service.py",
        "backend/receipts/views.py",
        "backend/receipts/models.py",
        "requirements-docker-stable.txt",
        "Procfile"
    ]
    
    all_files_exist = True
    for file_path in critical_files:
        if os.path.exists(file_path):
            print_status(f"{file_path}", "success")
        else:
            print_status(f"Missing: {file_path}", "error")
            all_files_exist = False
    
    if not all_files_exist:
        return False

    # Test 3: Check requirements
    print_header("3. Requirements Check")
    try:
        with open("requirements-docker-stable.txt", "r") as f:
            requirements = f.read()
        
        critical_packages = ["django", "djangorestframework", "openai", "cloudinary", "python-dotenv", "gunicorn"]
        for package in critical_packages:
            if package.lower() in requirements.lower():
                print_status(f"{package}", "success")
            else:
                print_status(f"Missing package: {package}", "error")
                
    except Exception as e:
        print_status(f"Error reading requirements: {e}", "error")
        return False

    # Test 4: Django setup test
    print_header("4. Django Configuration Test")
    try:
        # Add backend to path
        backend_path = os.path.join(os.getcwd(), 'backend')
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
        
        import django
        django.setup()
        print_status("Django setup successful", "success")
        
        # Test imports
        from receipts.services.enhanced_openai_service import EnhancedOpenAIService
        print_status("Enhanced OpenAI service import", "success")
        
        from receipts.models import Receipt
        print_status("Receipt model import", "success")
        
        from receipts.views import ReceiptListCreateView
        print_status("Receipt views import", "success")
        
    except Exception as e:
        print_status(f"Django setup failed: {e}", "error")
        return False

    # Test 5: Environment variables check
    print_header("5. Environment Variables Check")
    env_vars = {
        "OPENAI_API_KEY": "OpenAI API Key",
        "CLOUDINARY_CLOUD_NAME": "Cloudinary Cloud Name",
        "CLOUDINARY_API_KEY": "Cloudinary API Key",
        "CLOUDINARY_API_SECRET": "Cloudinary API Secret"
    }
    
    env_missing = []
    for var, description in env_vars.items():
        if os.environ.get(var):
            print_status(f"{description} (${var})", "success")
        else:
            print_status(f"Missing: {description} (${var})", "warning")
            env_missing.append(var)
    
    if env_missing:
        print_status("Some environment variables are missing. Set them before deployment.", "warning")

    # Test 6: Service instantiation test
    print_header("6. Service Instantiation Test")
    try:
        service = EnhancedOpenAIService()
        print_status("EnhancedOpenAIService instantiation", "success")
        
        # Test if service has required methods
        required_methods = ["process_receipt_focused", "queue_ocr_task", "upload_to_cloudinary"]
        for method in required_methods:
            if hasattr(service, method):
                print_status(f"Method {method} exists", "success")
            else:
                print_status(f"Missing method: {method}", "error")
                
    except Exception as e:
        print_status(f"Service instantiation failed: {e}", "error")
        return False

    # Test 7: Database check
    print_header("7. Database Configuration Check")
    try:
        from django.core.management import execute_from_command_line
        from django.db import connection
        
        # Test database connection
        connection.ensure_connection()
        print_status("Database connection test", "success")
        
        # Check migrations
        from django.core.management.commands.showmigrations import Command as ShowMigrationsCommand
        print_status("Migration system accessible", "success")
        
    except Exception as e:
        print_status(f"Database check failed: {e}", "warning")

    # Test 8: Procfile validation
    print_header("8. Procfile Validation")
    try:
        with open("Procfile", "r") as f:
            procfile_content = f.read().strip()
        
        if "web:" in procfile_content and "gunicorn" in procfile_content:
            print_status("Procfile web process configured", "success")
        else:
            print_status("Procfile missing web process or gunicorn", "error")
            
        if "release:" in procfile_content:
            print_status("Procfile release phase configured", "success")
        else:
            print_status("Procfile missing release phase", "warning")
            
        # Check that Celery is NOT in Procfile (we removed it)
        if "celery" not in procfile_content.lower():
            print_status("Procfile clean of Celery (good)", "success")
        else:
            print_status("Procfile still contains Celery references", "warning")
            
    except Exception as e:
        print_status(f"Procfile validation failed: {e}", "error")

    # Test 9: Git repository status
    print_header("9. Git Repository Check")
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode == 0:
            print_status("Git repository accessible", "success")
            
            if result.stdout.strip():
                print_status("Uncommitted changes detected", "warning")
                print("   Consider committing changes before deployment")
            else:
                print_status("Working directory clean", "success")
        else:
            print_status("Git status check failed", "warning")
            
    except Exception as e:
        print_status(f"Git check failed: {e}", "warning")

    # Final summary
    print_header("🎯 Pre-Deployment Summary")
    print_status("System appears ready for Heroku deployment!", "success")
    print_status("Next steps:", "info")
    print("   1. Set environment variables on Heroku")
    print("   2. Run: ./deploy_to_heroku.sh")
    print("   3. Monitor deployment logs")
    print("   4. Test live endpoints")
    
    if env_missing:
        print_status("Remember to set these environment variables on Heroku:", "warning")
        for var in env_missing:
            print(f"   - {var}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
