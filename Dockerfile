FROM python:3.11.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND noninteractive
ENV PYTHONPATH /app

# Add debugging for dependency issues
ENV PIP_NO_CACHE_DIR 1
ENV PIP_DISABLE_PIP_VERSION_CHECK 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    poppler-utils \
    libjpeg-dev \
    zlib1g-dev \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements with stable versions
COPY requirements-docker-stable.txt ./requirements.txt
# Install dependencies with specific order to avoid conflicts
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the project code
COPY backend/ .

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Expose port
EXPOSE 8000

# Run server using uvicorn instead of gunicorn for ASGI support
CMD ["uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000"]