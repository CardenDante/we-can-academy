# ACR122U NFC Reader Service

This is a standalone Node.js service that interfaces with the ACR122U NFC card reader and provides a REST API for the main Next.js application.

## Prerequisites

### Linux (Ubuntu/Debian)

1. **Install PC/SC Lite and build tools:**

```bash
sudo apt-get update
sudo apt-get install -y build-essential libpcsclite-dev pcscd
```

2. **Start the PC/SC daemon:**

```bash
sudo systemctl start pcscd
sudo systemctl enable pcscd
```

3. **Add your user to the `pcscd` group (optional, for non-root access):**

```bash
sudo usermod -a -G pcscd $USER
# Log out and back in for changes to take effect
```

### Windows

1. **Install Visual Studio Build Tools:**
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Select "Desktop development with C++" workload

2. **PC/SC support is built into Windows, no additional installation needed**

### macOS

1. **Install Xcode Command Line Tools:**

```bash
xcode-select --install
```

2. **PC/SC support is built into macOS, no additional installation needed**

## Installation

1. **Navigate to the nfc-service directory:**

```bash
cd /home/chacha/we-can-academy/nfc-service
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create environment file:**

```bash
cp .env.example .env
```

Edit `.env` if you need to change the port or allowed origin:

```env
NFC_SERVICE_PORT=3001
ALLOWED_ORIGIN=http://localhost:3000
```

## Running the Service

### Development Mode

```bash
npm run dev
```

This will start the service with auto-reload on file changes.

### Production Mode

```bash
npm start
```

## Connecting the ACR122U Reader

1. **Plug in your ACR122U NFC reader via USB**

2. **Verify the reader is detected:**

Linux:
```bash
pcsc_scan
```

Windows/macOS:
- The service will automatically detect the reader when you start it

3. **Start the NFC service** (as shown above)

4. **You should see:**
```
[NFC Service] Running on http://localhost:3001
[NFC Service] Waiting for ACR122U reader...
[NFC] Reader detected: ACS ACR122U PICC Interface 00 00
```

## Configuring the Next.js Application

Update your Next.js app's environment file (`reg-system/.env.local` or `.env`):

```env
# NFC Service URL
NFC_SERVICE_URL=http://localhost:3001
```

Restart your Next.js application after adding this.

## Testing the NFC Reader

### Test via API endpoints:

1. **Health check:**
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "service": "acr122u-nfc-service",
  "version": "1.0.0",
  "timestamp": 1705594123456
}
```

2. **Reader status:**
```bash
curl http://localhost:3001/status
```

Response when reader is connected:
```json
{
  "connected": true,
  "readerName": "ACS ACR122U PICC Interface 00 00",
  "lastScan": null
}
```

3. **Poll for card scans (long-polling):**
```bash
curl http://localhost:3001/poll
```

This will wait for a card to be scanned. Try tapping an NFC card on the reader.

## How NFC Cards Work with ACR122U

### Card UID as Admission Number

The ACR122U reads the **UID (Unique Identifier)** of NFC cards. This UID will be used as the admission number.

**Example:**
- Card UID: `04:A1:B2:C3:D4:E5:F0`
- Extracted admission number: `04A1B2C3D4E5F0`

### Writing Admission Numbers to NFC Cards

If you want to write custom admission numbers to NFC cards, you'll need:

1. **NDEF-formatted cards** (like NTAG213, NTAG215, NTAG216, Mifare Ultralight, etc.)

2. **An NFC writing app:**
   - **Android:** NFC Tools (free, available on Play Store)
   - **iOS:** NFC Tools (requires iPhone 7 or newer with iOS 13+)

3. **Write a Text Record:**
   - Open the NFC writing app
   - Create a new tag
   - Add a "Text" record
   - Enter the admission number (e.g., "WCA2024001")
   - Write to the card

The service will read this text record and use it as the admission number.

### Alternative: Use Card UID Directly

If you prefer to use the card's UID as the admission number:

1. Scan the card once to get its UID
2. Register the student with the UID as their admission number
3. Future scans will automatically match

## Production Deployment

### Running as a System Service (Linux)

Create a systemd service file `/etc/systemd/system/nfc-service.service`:

```ini
[Unit]
Description=ACR122U NFC Reader Service
After=network.target pcscd.service
Requires=pcscd.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/chacha/we-can-academy/nfc-service
ExecStart=/usr/bin/node /home/chacha/we-can-academy/nfc-service/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=NFC_SERVICE_PORT=3001
Environment=ALLOWED_ORIGIN=http://your-production-domain.com

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nfc-service
sudo systemctl start nfc-service
sudo systemctl status nfc-service
```

View logs:

```bash
sudo journalctl -u nfc-service -f
```

### Docker Deployment

For Docker deployment, you'll need to pass through the USB device to the container:

```yaml
# docker-compose.yml
services:
  nfc-service:
    build: ./nfc-service
    ports:
      - "3001:3001"
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    environment:
      - NFC_SERVICE_PORT=3001
      - ALLOWED_ORIGIN=http://localhost:3000
    restart: unless-stopped
```

## Troubleshooting

### Reader Not Detected

**Linux:**
```bash
# Check if pcscd is running
sudo systemctl status pcscd

# List USB devices
lsusb | grep -i acr

# Check PC/SC readers
pcsc_scan
```

**Windows:**
- Check Device Manager for "Smart card readers"
- Ensure drivers are installed

### Permission Denied

**Linux:**
```bash
# Add user to pcscd group
sudo usermod -a -G pcscd $USER

# Or run with sudo (not recommended for production)
sudo npm start
```

### Build Errors During npm install

Make sure you have the build tools installed:

**Linux:**
```bash
sudo apt-get install -y build-essential libpcsclite-dev
```

**Windows:**
- Install Visual Studio Build Tools with C++ support

### Service Can't Connect

1. Check firewall settings
2. Verify NFC_SERVICE_URL in Next.js environment matches the service URL
3. Check that the service is running: `curl http://localhost:3001/health`

## API Reference

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "acr122u-nfc-service",
  "version": "1.0.0",
  "timestamp": 1705594123456
}
```

### GET /status

Get reader connection status and last scan info.

**Response:**
```json
{
  "connected": true,
  "readerName": "ACS ACR122U PICC Interface 00 00",
  "lastScan": {
    "admissionNumber": "04A1B2C3D4E5F0",
    "timestamp": 1705594120000,
    "ago": 3456
  }
}
```

### GET /poll

Long-polling endpoint that waits for card scans (up to 25 seconds).

**Response (when card is scanned):**
```json
{
  "success": true,
  "data": {
    "admissionNumber": "04A1B2C3D4E5F0",
    "uid": "04A1B2C3D4E5F0",
    "type": "TAG_ISO_14443_3",
    "timestamp": 1705594123456
  }
}
```

**Response (timeout, no card):**
```json
{
  "success": true,
  "data": null
}
```

## Support

For issues specific to the ACR122U reader:
- ACS Documentation: https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/
- PC/SC Workgroup: https://pcscworkgroup.com/

For NFC technology:
- NFC Forum: https://nfc-forum.org/
