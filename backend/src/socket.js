module.exports = function(io, prisma){
  const state = {
    currentQuestionId: null,
    currentQuestion: null,
    questionTimer: null,
    timerSeconds: 15,
    students: {},
    registerToSocket: {}
  };

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('student:join', async (payload) => {
      const { registerNumber } = payload || {};
      if(!registerNumber) return;

      if (registerNumber !== 'ADMIN') {
        const student = await prisma.student.findUnique({ where: { registerNumber } }).catch(() => null);
        if (!student) {
          console.log(`Rejecting join: Student REG:${registerNumber} not found in DB`);
          socket.emit('student:kicked');
          socket.disconnect(true);
          return;
        }
        await prisma.student.update({ where: { registerNumber }, data: { connected: true } }).catch(() => {});
      }

      state.students[socket.id] = { registerNumber };
      state.registerToSocket[registerNumber] = socket.id;
      io.emit('lobby:update', { count: Object.keys(state.students).length });

      // For individual flow, we don't start a question on join anymore.
      // The client will fetch /api/quiz/next if the quiz is started.
    });

    socket.on('admin:startQuiz', () => {
      // Assuming authorization is handled (admin panel restriction)
      const { globalState } = require('./routes/quiz');
      globalState.quizStarted = true;
      io.emit('quiz:start');
    });

    socket.on('admin:stopQuiz', () => {
      const { globalState } = require('./routes/quiz');
      globalState.quizStarted = false;
      io.emit('quiz:stop');
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
      const student = await prisma.student.findUnique({ where: { registerNumber } });
      if (student) {
        io.emit('admin:cheat_alert', { 
          registerNumber: student.registerNumber, 
          name: student.name, 
          action: action || 'Window blur detected',
          timestamp: new Date().toISOString()
        });
      }
    });

    // We can also poll leaderboard or just update it when an answer is scored in HTTP route.
    // Let's add a listener that the HTTP route can trigger, but since HTTP and Socket are separate,
    // the HTTP route won't easily emit without `io`.
    // Alternatively, clients can poll, OR we can attach io to app.
    // For now, we will add an event to refresh leaderboard.
    socket.on('leaderboard:refresh', async () => {
      const leaderboard = await prisma.student.findMany({ orderBy: { score: 'desc' }, take: 20 });
      io.emit('leaderboard:update', { leaderboard });
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
      io.emit('lobby:update', { count: Object.keys(state.students).length });
      const leaderboard = await prisma.student.findMany({ orderBy: { score: 'desc' }, take: 20 });
      io.emit('leaderboard:update', { leaderboard });
    });

    socket.on('disconnect', async ()=>{
      console.log('disconnect', socket.id);
      const s = state.students[socket.id];
      if(s && s.registerNumber){
        await prisma.student.update({ where: { registerNumber: s.registerNumber }, data: { connected: false }}).catch(()=>{});
      }
      delete state.students[socket.id];
      if (s && s.registerNumber) delete state.registerToSocket[s.registerNumber];
      io.emit('lobby:update', { count: Object.keys(state.students).length });
    });
  });
};