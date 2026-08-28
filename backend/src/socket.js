module.exports = function(io, prisma){
  const state = {
    students: {},
    registerToSocket: {}
  };

  // Throttled broadcasts to avoid network congestion with 400+ concurrent clients
  let lobbyUpdateTimeout = null;
  const emitLobbyUpdateThrottled = () => {
    if (lobbyUpdateTimeout) return;
    lobbyUpdateTimeout = setTimeout(() => {
      lobbyUpdateTimeout = null;
      io.emit('lobby:update', { count: Object.keys(state.students).length });
    }, 400); // at most once every 400ms
  };

  let leaderboardUpdateTimeout = null;
  const emitLeaderboardUpdateThrottled = () => {
    if (leaderboardUpdateTimeout) return;
    leaderboardUpdateTimeout = setTimeout(async () => {
      leaderboardUpdateTimeout = null;
      try {
        const leaderboard = await prisma.student.findMany({ 
          orderBy: { score: 'desc' }, 
          take: 25,
          select: { id: true, name: true, registerNumber: true, department: true, score: true }
        });
        io.emit('leaderboard:update', { leaderboard });
      } catch (e) {
        console.error('Leaderboard update error:', e.message);
      }
    }, 800); // at most once every 800ms
  };

  io.on('connection', (socket) => {
    socket.on('student:join', async (payload) => {
      const { registerNumber } = payload || {};
      if(!registerNumber) return;

      if (registerNumber !== 'ADMIN') {
        const student = await prisma.student.findUnique({ 
          where: { registerNumber },
          select: { id: true, name: true }
        }).catch(() => null);

        if (!student) {
          socket.emit('student:kicked');
          socket.disconnect(true);
          return;
        }

        // Non-blocking connection status update
        prisma.student.update({ where: { registerNumber }, data: { connected: true } }).catch(() => {});
      }

      state.students[socket.id] = { registerNumber };
      state.registerToSocket[registerNumber] = socket.id;
      emitLobbyUpdateThrottled();
    });

    socket.on('admin:startQuiz', (payload) => {
      const { quizNumber } = payload || {};
      const { globalState } = require('./routes/quiz');
      if (quizNumber && Number(quizNumber) > 0) {
        globalState.activeQuizNumber = Number(quizNumber);
      }
      globalState.quizStarted = true;
      globalState.currentQuestionIndex = 1;
      globalState.showLeaderboardOverlay = false;
      io.emit('leaderboard:display', { show: false });
      io.emit('quiz:start', {
        quizNumber: globalState.activeQuizNumber,
        answerTimeLimit: globalState.answerTimeLimit,
        previewTimeLimit: globalState.previewTimeLimit
      });
    });

    socket.on('admin:nextQuestion', () => {
      const { globalState } = require('./routes/quiz');
      globalState.currentQuestionIndex += 1;
      globalState.showLeaderboardOverlay = false;
      io.emit('leaderboard:display', { show: false });
      io.emit('quiz:nextQuestion', {
        quizNumber: globalState.activeQuizNumber,
        currentQuestionIndex: globalState.currentQuestionIndex
      });
    });

    socket.on('admin:showLeaderboard', async (payload) => {
      const { globalState } = require('./routes/quiz');
      const show = payload?.show !== undefined ? Boolean(payload.show) : true;
      globalState.showLeaderboardOverlay = show;
      try {
        const leaderboard = await prisma.student.findMany({ 
          orderBy: { score: 'desc' }, 
          take: 25,
          select: { id: true, name: true, registerNumber: true, department: true, score: true }
        });
        io.emit('leaderboard:display', { show, leaderboard });
      } catch (e) {
        console.error('Leaderboard broadcast error:', e.message);
        io.emit('leaderboard:display', { show, leaderboard: [] });
      }
    });

    socket.on('admin:stopQuiz', () => {
      const { globalState } = require('./routes/quiz');
      globalState.quizStarted = false;
      globalState.showLeaderboardOverlay = false;
      io.emit('leaderboard:display', { show: false });
      io.emit('quiz:stop', {
        quizNumber: globalState.activeQuizNumber
      });
    });

    socket.on('admin:hardReset', () => {
      const { globalState } = require('./routes/quiz');
      globalState.quizStarted = false;
      state.students = {};
      state.registerToSocket = {};
      io.emit('quiz:stop');
      io.emit('student:kicked');
      io.emit('lobby:update', { count: 0 });
    });

    socket.on('student:cheat_alert', async (payload) => {
      const { registerNumber, action } = payload || {};
      if (!registerNumber) return;
      const student = await prisma.student.findUnique({ 
        where: { registerNumber },
        select: { registerNumber: true, name: true }
      });
      if (student) {
        io.emit('admin:cheat_alert', { 
          registerNumber: student.registerNumber, 
          name: student.name, 
          action: action || 'Window blur detected',
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('leaderboard:refresh', () => {
      emitLeaderboardUpdateThrottled();
    });

    socket.on('admin:removeParticipant', async (payload) => {
      const { registerNumber } = payload || {};
      if (!registerNumber) return;
      const student = await prisma.student.findUnique({ where: { registerNumber } }).catch(() => null);
      if (student) {
        await prisma.answer.deleteMany({ where: { studentId: student.id } }).catch(() => {});
        await prisma.student.delete({ where: { registerNumber } }).catch(() => {});
      }

      const targetSocketId = state.registerToSocket[registerNumber];
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('student:kicked', { reason: 'removed by admin' });
          targetSocket.disconnect(true);
        }
      }

      delete state.registerToSocket[registerNumber];
      delete state.students[targetSocketId];
      emitLobbyUpdateThrottled();
      emitLeaderboardUpdateThrottled();
    });

    socket.on('disconnect', () => {
      const s = state.students[socket.id];
      if(s && s.registerNumber){
        prisma.student.update({ where: { registerNumber: s.registerNumber }, data: { connected: false }}).catch(()=>{});
        delete state.registerToSocket[s.registerNumber];
      }
      delete state.students[socket.id];
      emitLobbyUpdateThrottled();
    });
  });
};