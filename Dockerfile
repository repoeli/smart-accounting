FROM python:3.11.9-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    poppler-utils \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
COPY backend/requirements.txt ./backend-requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -r backend-requirements.txt
COPY backend/ .
RUN python manage.py collectstatic --noinput
EXPOSE $PORT
# Use Gunicorn for production
CMD gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT