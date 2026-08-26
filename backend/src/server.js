require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const prisma = require('./db');
const socketHandler = require('./socket');

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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

socketHandler(io, prisma);

const port = process.env.PORT || 4000;
server.listen(port, () => console.log('Backend listening on', port));
