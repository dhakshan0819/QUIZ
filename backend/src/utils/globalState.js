// Single global state object shared across Express routes and Socket.io handlers
const globalState = {
  quizStarted: false,
  activeQuizNumber: 1,
  currentQuestionIndex: 1,
  showLeaderboardOverlay: false,
  answerTimeLimit: 15,
  previewTimeLimit: 5
};

module.exports = globalState;
