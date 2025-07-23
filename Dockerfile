FROM python:3.11.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_DEFAULT_TIMEOUT=100

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    poppler-utils \
    libjpeg-dev \
    zlib1g-dev \
    libmagic1 \
    libmagic-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Skip pip upgrade to avoid SSL issues
# Use the pip that comes with the Python image

# Copy requirements file
COPY requirements-docker-minimal.txt ./requirements.txt

# Install Python dependencies without upgrading pip
RUN pip install --no-cache-dir --timeout 1000 -r requirements.txt

# Copy the project code
COPY backend/ .

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Expose port
EXPOSE 8000

# Run server using uvicorn instead of gunicorn for ASGI support
CMD ["uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000"]