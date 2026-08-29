// Production Server Entry Point (Railway deployment sync 2026-08-29)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

require('dotenv').config();
const http = require('http');
http.globalAgent.maxSockets = Infinity;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const prisma = require('./db');
const socketHandler = require('./socket');
const submissionQueue = require('./utils/submissionQueue');

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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/quiz', require('./routes/quiz'));

app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany({ orderBy: { id: 'asc' } });
  res.json({ questions });
});

app.get('/health', (req, res) => res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() }));

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
server.maxConnections = 1000;

const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling']
});

socketHandler(io, prisma);

const primaryPort = Number(process.env.PORT) || 8080;
server.listen(primaryPort, '0.0.0.0', () => console.log('Backend server running on 0.0.0.0:' + primaryPort));

if (primaryPort !== 4000) {
  try {
    const backupServer = http.createServer(app);
    backupServer.maxConnections = 1000;
    io.attach(backupServer);
    backupServer.listen(4000, '0.0.0.0', () => console.log('Backup listener active on 0.0.0.0:4000'));
  } catch (e) {
    console.warn('Backup port 4000 notice:', e.message);
  }
}
