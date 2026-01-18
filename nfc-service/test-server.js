// Simple test server
import express from 'express';

const app = express();
const PORT = process.env.NFC_SERVICE_PORT || 3001;

console.log('[TEST] Starting simple Express server...');

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TEST] Server listening on http://0.0.0.0:${PORT}`);
});
