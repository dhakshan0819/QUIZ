const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/admin/login', (req, res)=>{
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'username/password required' });
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedPass = process.env.ADMIN_PASS || 'password';
  if(username === expectedUser && password === expectedPass){
    const token = jwt.sign({ role: 'admin', user: username }, process.env.ADMIN_SECRET || 'secret', { expiresIn: '8h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'invalid credentials' });
});

router.post('/student/login', async (req, res) => {
  const { registerNumber, name } = req.body || {};
  if (!registerNumber) return res.status(400).json({ error: 'registerNumber required' });

  const prisma = require('../db');
  const student = await prisma.student.findUnique({ where: { registerNumber } });
  if (!student) return res.status(404).json({ error: 'student not found' });
  if (name && student.name.toLowerCase() !== String(name).trim().toLowerCase()) {
    return res.status(401).json({ error: 'name mismatch' });
  }

  const token = jwt.sign(
    { role: 'student', registerNumber: student.registerNumber, studentId: student.id },
    process.env.ADMIN_SECRET || 'secret',
    { expiresIn: '8h' }
  );

  return res.json({ token, student });
});

module.exports = router;