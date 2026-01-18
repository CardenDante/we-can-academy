/**
 * ACR122U NFC Reader Service
 *
 * This is a standalone Express server that manages the ACR122U NFC card reader.
 * It provides a simple REST API that the main Next.js application can poll
 * to detect when NFC cards are scanned.
 *
 * The service runs on port 3001 and provides:
 * - GET /status - Check if reader is connected
 * - GET /poll - Long-polling endpoint that waits for card scans
 * - GET /health - Health check endpoint
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.NFC_SERVICE_PORT || 3001;

// Try to import NFC library - if it fails, service will still run without NFC functionality
let NFC = null;
let nfcImportError = null;

try {
  const nfcModule = await import('nfc-pcsc');
  NFC = nfcModule.NFC;
  console.log('[NFC] nfc-pcsc library loaded successfully');
} catch (err) {
  nfcImportError = err.message;
  console.error('[NFC] Failed to load nfc-pcsc library:', err.message);
  console.error('[NFC] Service will run in limited mode without NFC support');
}

// Enable CORS for Next.js app
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// NFC reader state
let nfcReader = null;
let isReaderConnected = false;
let lastCardData = null;
let lastCardTime = 0;
const pendingPolls = [];
let nfc = null;

// Initialize NFC reader - called AFTER server starts to avoid blocking
function initializeNFC() {
  if (!NFC) {
    console.log('[NFC] NFC library not available - service running in limited mode');
    if (nfcImportError) {
      console.log('[NFC] Import error:', nfcImportError);
    }
    return;
  }

  console.log('[NFC] Initializing NFC reader...');

  try {
    nfc = new NFC();

    nfc.on('reader', reader => {
      console.log(`[NFC] Reader detected: ${reader.name}`);
      nfcReader = reader;
      isReaderConnected = true;

      reader.on('card', card => {
        console.log('[NFC] Card detected:', {
          type: card.type,
          uid: card.uid,
          atr: card.atr?.toString('hex')
        });

        // Extract UID (admission number stored in UID)
        const uid = card.uid;
        const admissionNumber = uid.toUpperCase();

        const now = Date.now();

        // Debounce - ignore if same card scanned within 2 seconds
        if (lastCardData === admissionNumber && (now - lastCardTime) < 2000) {
          console.log('[NFC] Debouncing duplicate scan');
          return;
        }

        lastCardData = admissionNumber;
        lastCardTime = now;

        const cardData = {
          admissionNumber,
          uid,
          type: card.type,
          timestamp: now
        };

        console.log('[NFC] Processing card:', cardData);

        // Notify all pending poll requests
        while (pendingPolls.length > 0) {
          const { res, timeout } = pendingPolls.shift();
          clearTimeout(timeout);
          res.json({
            success: true,
            data: cardData
          });
        }

        // Read NDEF data if available
        try {
          reader.read(0, 16).then(buffer => {
            console.log('[NFC] Block 0 data:', buffer.toString('hex'));
          }).catch(err => {
            console.log('[NFC] Could not read block data:', err.message);
          });
        } catch (err) {
          console.log('[NFC] Read error:', err.message);
        }
      });

      reader.on('card.off', card => {
        console.log('[NFC] Card removed:', card.uid);
      });

      reader.on('error', err => {
        console.error('[NFC] Reader error:', err);
      });

      reader.on('end', () => {
        console.log('[NFC] Reader disconnected');
        isReaderConnected = false;
        nfcReader = null;
      });
    });

    nfc.on('error', err => {
      console.error('[NFC] Error:', err);
      isReaderConnected = false;
    });

    console.log('[NFC] Waiting for ACR122U reader...');
  } catch (err) {
    console.error('[NFC] Failed to initialize NFC:', err);
  }
}

// API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'acr122u-nfc-service',
    version: '1.0.0',
    timestamp: Date.now(),
    nfcAvailable: NFC !== null,
    readerConnected: isReaderConnected
  });
});

// Reader status
app.get('/status', (req, res) => {
  res.json({
    connected: isReaderConnected,
    readerName: nfcReader?.name || null,
    lastScan: lastCardTime > 0 ? {
      admissionNumber: lastCardData,
      timestamp: lastCardTime,
      ago: Date.now() - lastCardTime
    } : null
  });
});

// Long-polling endpoint for card scans
// Waits up to 25 seconds for a card to be scanned
app.get('/poll', (req, res) => {
  if (!NFC) {
    return res.status(503).json({
      success: false,
      error: 'NFC library not available'
    });
  }

  if (!isReaderConnected) {
    return res.status(503).json({
      success: false,
      error: 'NFC reader not connected'
    });
  }

  // Set up timeout (25 seconds to stay under typical 30s timeout)
  const timeout = setTimeout(() => {
    // Remove this request from pending list
    const index = pendingPolls.findIndex(p => p.res === res);
    if (index !== -1) {
      pendingPolls.splice(index, 1);
    }

    // Return no data (client will poll again)
    res.json({
      success: true,
      data: null
    });
  }, 25000);

  // Add to pending polls
  pendingPolls.push({ res, timeout });

  // Clean up on client disconnect
  req.on('close', () => {
    const index = pendingPolls.findIndex(p => p.res === res);
    if (index !== -1) {
      clearTimeout(pendingPolls[index].timeout);
      pendingPolls.splice(index, 1);
    }
  });
});

// Start server
console.log(`[NFC Service] Starting server on port ${PORT}...`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NFC Service] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[NFC Service] Allowed origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:3000'}`);

  // Initialize NFC AFTER server is running (non-blocking)
  setImmediate(() => {
    initializeNFC();
    console.log('[NFC Service] Ready!');
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[NFC Service] Shutting down...');

  // Clear all pending polls
  while (pendingPolls.length > 0) {
    const { res, timeout } = pendingPolls.shift();
    clearTimeout(timeout);
    res.json({ success: false, error: 'Service shutting down' });
  }

  process.exit(0);
});
