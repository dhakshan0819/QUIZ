const globalState = require('./utils/globalState');

const state = {
  students: {},
  registerToSocket: {},
  lockedStudents: {} // { [registerNumber]: { reason, timestamp, name } }
};

function isStudentLocked(registerNumber) {
  return Boolean(state.lockedStudents[registerNumber]);
}

function getLockedReason(registerNumber) {
  return state.lockedStudents[registerNumber]?.reason || null;
}

function unlockStudent(registerNumber) {
  delete state.lockedStudents[registerNumber];
}

function getLockedStudents() {
  return state.lockedStudents;
}

function socketHandler(io, prisma) {
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

      // If student was already locked by anti-cheat, enforce lock immediately
      if (state.lockedStudents[registerNumber]) {
        socket.emit('student:locked', {
          reason: state.lockedStudents[registerNumber].reason,
          timestamp: state.lockedStudents[registerNumber].timestamp
        });
      }
    });

    socket.on('admin:startQuiz', (payload) => {
      const { quizNumber } = payload || {};
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
      globalState.currentQuestionIndex += 1;
      globalState.showLeaderboardOverlay = false;
      io.emit('leaderboard:display', { show: false });
      io.emit('quiz:nextQuestion', {
        quizNumber: globalState.activeQuizNumber,
        currentQuestionIndex: globalState.currentQuestionIndex
      });
    });

    socket.on('admin:showLeaderboard', async (payload) => {
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
      state.lockedStudents = {};
      io.emit('quiz:stop');
      io.emit('student:kicked');
      io.emit('lobby:update', { count: 0 });
    });

    // Anti-Cheat: Lock student screen and notify admin
    socket.on('student:cheat_alert', async (payload) => {
      const { registerNumber, action } = payload || {};
      if (!registerNumber) return;
      const student = await prisma.student.findUnique({ 
        where: { registerNumber },
        select: { registerNumber: true, name: true }
      });
      if (student) {
        const reason = action || 'Window focus lost (switched tabs or apps)';
        const timestamp = new Date().toISOString();
        
        // Save to locked students registry
        state.lockedStudents[registerNumber] = {
          reason,
          timestamp,
          name: student.name
        };

        // Lock student's screen immediately
        const targetSocketId = state.registerToSocket[registerNumber];
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit('student:locked', {
              reason,
              timestamp
            });
          }
        }

        // Broadcast alert to admin panel
        io.emit('admin:cheat_alert', { 
          registerNumber: student.registerNumber, 
          name: student.name, 
          action: reason,
          timestamp,
          locked: true
        });
      }
    });

    // Admin: Explicitly unlock a student so they can resume
    socket.on('admin:unlockStudent', (payload) => {
      const { registerNumber } = payload || {};
      if (!registerNumber) return;
      
      delete state.lockedStudents[registerNumber];

      // Notify the student's screen to unlock and resume
      const targetSocketId = state.registerToSocket[registerNumber];
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('student:unlocked', { registerNumber });
        }
      }

      // Notify admin dashboard
      io.emit('admin:student_unlocked', { registerNumber });
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
      delete state.lockedStudents[registerNumber];
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
}

module.exports = socketHandler;
module.exports.state = state;
module.exports.isStudentLocked = isStudentLocked;
module.exports.getLockedReason = getLockedReason;
module.exports.unlockStudent = unlockStudent;
module.exports.getLockedStudents = getLockedStudents;