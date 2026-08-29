const express = require('express');
const router = express.Router();
const prisma = require('../db');
const jwt = require('jsonwebtoken');

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'admin token required' });
  try {
    req.admin = jwt.verify(token, process.env.ADMIN_SECRET || 'secret');
    next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid admin token' });
  }
}

const quizCache = require('../utils/quizCache');

router.post('/register', async (req, res)=>{
  const { name, registerNumber, department, year, section } = req.body || {};
  if(!name || !registerNumber) return res.status(400).json({ error: 'name and registerNumber required' });
  try {
    // 1. Instant check in RAM
    const cached = quizCache.getStudentByRegister(registerNumber);
    if (cached) return res.status(409).json({ error: 'duplicate register number' });

    let existing = await prisma.student.findUnique({ where: { registerNumber } }).catch(() => null);
    if (existing) {
      quizCache.cacheStudent(existing);
      return res.status(409).json({ error: 'duplicate register number' });
    }

    const student = await prisma.student.create({ 
      data: { name, registerNumber, department: department || '', year: year || '', section: section || '' } 
    }).catch((e) => {
      console.warn('DB student creation fallback:', e.message);
      const fallbackId = Date.now();
      return { id: fallbackId, name, registerNumber, department: department || '', year: year || '', section: section || '', score: 0 };
    });

    quizCache.cacheStudent(student);
    return res.json({ student });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Registration error: ' + err.message });
  }
});

router.get('/', async (req, res)=>{
  try {
    const students = await prisma.student.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ students });
  } catch (err) {
    console.error('Fetch students error:', err.message);
    res.status(500).json({ error: 'Database error fetching students' });
  }
});

router.delete('/:registerNumber', verifyAdmin, async (req, res) => {
  const { registerNumber } = req.params;
  const existing = await prisma.student.findUnique({ where: { registerNumber } });
  if (!existing) return res.status(404).json({ error: 'student not found' });

  await prisma.answer.deleteMany({ where: { studentId: existing.id } }).catch(() => {});
  await prisma.student.delete({ where: { registerNumber } });
  return res.json({ removed: true, registerNumber });
});

router.put('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, registerNumber, department, score } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(id, 10) },
      data: { name, registerNumber, department, score: parseInt(score, 10) || 0 }
    });
    res.json({ student });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update student' });
  }
});

router.post('/manual', verifyAdmin, async (req, res) => {
  const { name, registerNumber, department, score } = req.body;
  try {
    const student = await prisma.student.create({
      data: { 
        name, 
        registerNumber, 
        department: department || '',
        score: parseInt(score, 10) || 0,
        year: '', section: ''
      }
    });
    res.json({ student });
  } catch (e) {
    res.status(400).json({ error: 'Failed to add student (possibly duplicate register number)' });
  }
});

module.exports = router;