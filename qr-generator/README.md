# QR Code Label Generator Service

A simple Flask-based service for generating printable QR code labels from admission numbers.

## Features

- Generate QR codes from admission numbers
- Configurable label sizes (30mm, 40mm, 50mm)
- Print-optimized output (300 DPI for professional printing)
- Browser print dialog compatible with USB and network printers
- Minimal dependencies and lightweight Docker image

## Quick Start

### Using Docker

```bash
# Build the image
docker build -t qr-generator .

# Run the service
docker run -p 3002:3002 qr-generator
```

Access the service at: `http://localhost:3002/qr-gen`

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python app.py
```

## API Endpoints

### `GET /qr-gen`
Renders the QR code generator interface.

### `POST /qr-gen/generate`
Generates a QR code from the provided admission number.

**Request Body:**
```json
{
  "admission_number": "ADM12345",
  "size": 30
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "admission_number": "ADM12345",
  "size_mm": 30
}
```

### `GET /qr-gen/health`
Health check endpoint.

## Printing

The generated QR codes are optimized for printing:
- 300 DPI resolution for professional quality
- Exact dimensions in millimeters
- Works with any printer connected to the browser (USB/Network)
- Clean print layout without UI elements

## Integration

This service is designed to run alongside the main We Can Academy application and can be accessed at the `/qr-gen` route when deployed with the Docker Compose setup.
