# QR Generator Service Dockerfile

FROM python:3.11-alpine

# Install system dependencies for Pillow
RUN apk add --no-cache \
    gcc \
    musl-dev \
    jpeg-dev \
    zlib-dev \
    libjpeg

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py ./
COPY templates ./templates

# Expose port
EXPOSE 3002

# Run the Flask application
CMD ["python", "app.py"]
