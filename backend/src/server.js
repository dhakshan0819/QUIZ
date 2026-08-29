require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const prisma = require('./db');
const socketHandler = require('./socket');
const submissionQueue = require('./utils/submissionQueue');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function initDatabaseAndQueue() {
  try {
    if (submissionQueue && typeof submissionQueue.init === 'function') {
      await submissionQueue.init(prisma);
      console.log('Submission queue and DB cache initialized.');
    }
  } catch (err) {
    console.warn('Queue initialization note:', err.message);
  }
}

initDatabaseAndQueue();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/quiz', require('./routes/quiz'));

app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany();
  res.json({ questions });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const path = require('path');
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
const fs = require('fs');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

socketHandler(io, prisma);

const port = Number(process.env.PORT) || 4000;
server.listen(port, '0.0.0.0', () => console.log('Backend listening on 0.0.0.0:' + port));
