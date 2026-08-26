const QRCode = require('qrcode');

async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error('Error generating QR code:', err);
    return null;
  }
}

module.exports = { generateQRCode };
