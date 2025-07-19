FROM python:3.11.9-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
COPY backend/requirements.txt ./backend-requirements.txt
RUN apt-get update && apt-get install -y libjpeg-dev zlib1g-dev
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -r backend-requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]