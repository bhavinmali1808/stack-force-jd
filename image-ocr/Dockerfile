FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies list and install (works whether context is root or subfolder)
COPY image-ocr/requirements.txt* requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvloop httptools

# Copy application files
COPY image-ocr/ ./
COPY . ./

# Expose server port
EXPOSE 8000

# Start server using production Gunicorn with Uvicorn workers on dynamic $PORT
CMD exec gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000}
