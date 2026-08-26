const express = require('express');
const router = express.Router();
const { generateQRCode } = require('../utils/qrgen');

// Generate QR code for joining the quiz
router.get('/join-qr', async (req, res) => {
  try {
    const joinUrl = `http://${req.hostname}:5173/register`;
    const qrDataUrl = await generateQRCode(joinUrl);
    res.json({ qrCode: qrDataUrl, url: joinUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
