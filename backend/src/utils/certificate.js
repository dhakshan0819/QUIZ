const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateCertificatePDF(studentName, registerNumber, department, score, rank, collegeName = 'College Name') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        buffered: false
      });

      // Generate PDF in memory
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Certificate design with cyber theme
      doc.fontSize(10).text(collegeName, { align: 'center' });
      doc.moveTo(100, doc.y + 5).lineTo(500, doc.y).stroke('#00e5ff');
      doc.moveDown(2);

      doc.fontSize(28).font('Helvetica-Bold').text('CERTIFICATE OF PARTICIPATION', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica').text('Cyber Security Quiz Arena', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).text('This is to certify that', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(16).font('Helvetica-Bold').text(studentName, { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica').text(`Register Number: ${registerNumber}`, { align: 'center' });
      doc.text(`Department: ${department}`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(11).text(`has successfully participated in the Cyber Security Quiz Competition`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text(`Final Score: ${score} | Rank: ${rank}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      doc.moveDown(1);
      doc.text('Organizer Signature: ___________________', { align: 'left' });

      doc.moveTo(100, doc.y - 10).lineTo(500, doc.y - 10).stroke('#00e5ff');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatePDF };
