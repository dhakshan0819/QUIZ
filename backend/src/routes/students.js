const express = require('express');
const router = express.Router();
const prisma = require('../db');
const jwt = require('jsonwebtoken');
const submissionQueue = require('../utils/submissionQueue');

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin token required' });
  try {
    req.admin = jwt.verify(token, process.env.ADMIN_SECRET || 'secret');
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

// Student Registration / Login
router.post('/register', async (req, res) => {
  const { name, registerNumber, department, year, section } = req.body || {};
  if (!name || !registerNumber) {
    return res.status(400).json({ error: 'Name and Register Number are required.' });
  }

  const cleanRegNo = String(registerNumber).trim();
  const cleanName = String(name).trim();
  const cleanDept = String(department || '').trim();
  const cleanYear = String(year || '').trim();
  const cleanSec = String(section || '').trim();

  try {
    const existing = await prisma.student.findUnique({ where: { registerNumber: cleanRegNo } });
    if (existing) {
      submissionQueue.cacheStudent(existing);
      const token = jwt.sign(
        { role: 'student', registerNumber: existing.registerNumber, studentId: existing.id },
        process.env.ADMIN_SECRET || 'secret',
        { expiresIn: '24h' }
      );
      return res.json({ 
        student: existing, 
        token, 
        message: `Welcome back, ${existing.name}!` 
      });
    }

    const student = await prisma.student.create({
      data: {
        name: cleanName,
        registerNumber: cleanRegNo,
        department: cleanDept,
        year: cleanYear,
        section: cleanSec
      }
    });

    submissionQueue.cacheStudent(student);

    const token = jwt.sign(
      { role: 'student', registerNumber: student.registerNumber, studentId: student.id },
      process.env.ADMIN_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({ 
      student, 
      token, 
      message: 'Registration successful! Welcome to the Arena.' 
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Database registration error: ' + err.message });
  }
});

// Fetch all registered students
router.get('/', async (req, res) => {
  try {
    const students = await prisma.student.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ students });
  } catch (err) {
    console.error('Fetch students error:', err.message);
    res.status(500).json({ error: 'Database error fetching students' });
  }
});

// Remove a student by register number (Admin only)
router.delete('/:registerNumber', verifyAdmin, async (req, res) => {
  const cleanRegNo = String(req.params.registerNumber).trim();
  try {
    const existing = await prisma.student.findUnique({ where: { registerNumber: cleanRegNo } });
    if (!existing) return res.status(404).json({ error: 'Student not found' });

    await prisma.answer.deleteMany({ where: { studentId: existing.id } }).catch(() => {});
    await prisma.student.delete({ where: { registerNumber: cleanRegNo } });
    submissionQueue.removeStudentFromCache(cleanRegNo);

    return res.json({ removed: true, registerNumber: cleanRegNo });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

// Update a student (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, registerNumber, department, score } = req.body || {};
  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        name: String(name).trim(),
        registerNumber: String(registerNumber).trim(),
        department: String(department || '').trim(),
        score: parseInt(score, 10) || 0
      }
    });
    submissionQueue.cacheStudent(student);
    res.json({ student });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update student: ' + e.message });
  }
});

// Add student manually (Admin only)
router.post('/manual', verifyAdmin, async (req, res) => {
  const { name, registerNumber, department, score } = req.body || {};
  if (!name || !registerNumber) return res.status(400).json({ error: 'Name and register number required' });

  try {
    const student = await prisma.student.create({
      data: { 
        name: String(name).trim(), 
        registerNumber: String(registerNumber).trim(), 
        department: String(department || '').trim(),
        score: parseInt(score, 10) || 0,
        year: '', 
        section: ''
      }
    });
    submissionQueue.cacheStudent(student);
    res.status(201).json({ student });
  } catch (e) {
    res.status(400).json({ error: 'Failed to add student (register number might already exist).' });
  }
});

module.exports = router;