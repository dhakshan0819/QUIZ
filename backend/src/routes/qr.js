const express = require('express');
const router = express.Router();
const os = require('os');
const { generateQRCode } = require('../utils/qrgen');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4 and not internal loopback
      if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Generate QR code for joining the quiz over LAN
router.get('/join-qr', async (req, res) => {
  try {
    const hostIp = getLocalIp();
    const port = 5173;
    const joinUrl = `http://${hostIp}:${port}/register`;
    const qrDataUrl = await generateQRCode(joinUrl);
    res.json({ qrCode: qrDataUrl, url: joinUrl, ip: hostIp, port });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
