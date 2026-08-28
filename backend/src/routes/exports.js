const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const { generateCertificatePDF } = require('../utils/certificate');

// Export results as CSV
router.get('/results/csv', async (req, res) => {
  try {
    const students = await prisma.student.findMany({ orderBy: { score: 'desc' } });
    const answers = await prisma.answer.findMany();
    
    let csvContent = 'Rank,Name,Register Number,Department,Score,Correct Answers,Wrong Answers\n';
    students.forEach((s, idx) => {
      const studentAnswers = answers.filter(a => a.studentId === s.id);
      const correct = studentAnswers.filter(a => a.correct).length;
      const wrong = studentAnswers.filter(a => !a.correct).length;
      csvContent += `${idx + 1},"${s.name}","${s.registerNumber}","${s.department}",${s.score},${correct},${wrong}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="quiz_results.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export results as XLSX
router.get('/results/xlsx', async (req, res) => {
  try {
    const students = await prisma.student.findMany({ orderBy: { score: 'desc' } });
    const answers = await prisma.answer.findMany();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Register Number', key: 'registerNumber', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 8 },
      { header: 'Correct Answers', key: 'correct', width: 15 },
      { header: 'Wrong Answers', key: 'wrong', width: 15 }
    ];

    students.forEach((s, idx) => {
      const studentAnswers = answers.filter(a => a.studentId === s.id);
      const correct = studentAnswers.filter(a => a.correct).length;
      const wrong = studentAnswers.filter(a => !a.correct).length;
      
      worksheet.addRow({
        rank: idx + 1,
        name: s.name,
        registerNumber: s.registerNumber,
        department: s.department,
        score: s.score,
        year: s.year,
        section: s.section,
        correct: correct,
        wrong: wrong
      });
    });

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', 'attachment; filename="quiz_results.xlsx"');
    
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate certificate PDF for a student
router.get('/certificate/:registerNumber', async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { registerNumber: req.params.registerNumber }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const allStudents = await prisma.student.findMany({ orderBy: { score: 'desc' } });
    const rank = allStudents.findIndex(s => s.id === student.id) + 1;

    const pdfBuffer = await generateCertificatePDF(
      student.name,
      student.registerNumber,
      student.department,
      student.score,
      rank,
      'SIH Quiz Arena'
    );

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="certificate_${student.registerNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
