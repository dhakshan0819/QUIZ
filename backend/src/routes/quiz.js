const express = require('express');
const router = express.Router();
const prisma = require('../db');

// In-memory global state for the quiz.
// In a production app with multiple node processes, this would be in Redis or DB.
const globalState = {
  quizStarted: false
};

// Admin endpoint to start the quiz globally
router.post('/start', async (req, res) => {
  // Assuming auth happens before this or in the handler
  globalState.quizStarted = true;
  res.json({ success: true, quizStarted: true });
});

// Admin endpoint to stop/reset quiz state if needed
router.post('/stop', async (req, res) => {
  globalState.quizStarted = false;
  res.json({ success: true, quizStarted: false });
});

// Admin endpoint for complete system hard reset
router.post('/hard-reset', async (req, res) => {
  // Reset state
  globalState.quizStarted = false;
  
  // Wipe all database records related to students and answers
  try {
    await prisma.answer.deleteMany({});
    await prisma.student.deleteMany({});
    res.json({ success: true, message: 'Database wiped successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to wipe database.' });
  }
});

// Get global quiz status
router.get('/status', (req, res) => {
  res.json({ quizStarted: globalState.quizStarted });
});

// Get the next unanswered question for a student
router.get('/next', async (req, res) => {
  const { registerNumber } = req.query;
  
  if (!globalState.quizStarted) {
    return res.json({ quizStarted: false });
  }

  if (!registerNumber) {
    return res.status(400).json({ error: 'registerNumber required' });
  }

  const student = await prisma.student.findUnique({ where: { registerNumber } });
  if (!student) {
    return res.status(404).json({ error: 'student not found' });
  }

  // Find all question IDs this student has already answered
  const answers = await prisma.answer.findMany({
    where: { studentId: student.id },
    select: { questionId: true }
  });
  
  const answeredQuestionIds = answers.map(a => a.questionId);

  // Find all available unanswered questions
  const availableQuestions = await prisma.question.findMany({
    where: { id: { notIn: answeredQuestionIds } },
    select: { id: true }
  });

  if (availableQuestions.length === 0) {
    return res.json({ quizStarted: true, complete: true });
  }

  // Pick a random question ID
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const randomQuestionId = availableQuestions[randomIndex].id;

  const nextQuestion = await prisma.question.findUnique({
    where: { id: randomQuestionId }
  });

  // Remove the correct answer and explanation before sending to client
  const { correct, explanation, fact, ...safeQuestion } = nextQuestion;

  const totalQuestions = answeredQuestionIds.length + availableQuestions.length;
  const currentQuestionNumber = answeredQuestionIds.length + 1;

  res.json({ 
    quizStarted: true, 
    complete: false, 
    question: safeQuestion,
    progress: { current: currentQuestionNumber, total: totalQuestions }
  });
});

// Submit an answer
router.post('/submit', async (req, res) => {
  const { registerNumber, questionId, option, timeMs } = req.body;
  
  if (!globalState.quizStarted) {
    return res.status(400).json({ error: 'Quiz has not started' });
  }

  if (!registerNumber || !questionId || !option) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const student = await prisma.student.findUnique({ where: { registerNumber } });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const existing = await prisma.answer.findFirst({
    where: { studentId: student.id, questionId }
  });

  if (existing) {
    return res.status(400).json({ error: 'Already answered this question' });
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const isCorrect = question.correct === option;

  // Create the answer
  await prisma.answer.create({
    data: {
      studentId: student.id,
      questionId,
      option,
      correct: isCorrect,
      timeMs: timeMs || 0,
      scored: true // Score immediately in individual mode
    }
  });

  // Update student score immediately
  if (isCorrect) {
    await prisma.student.update({
      where: { id: student.id },
      data: { score: { increment: question.points || 10 } }
    });
  }

  // Return the correct answer to the client for auto-reveal
  res.json({
    success: true,
    correct: question.correct,
    explanation: question.explanation,
    fact: question.fact,
    isCorrect
  });
});

module.exports = router;
module.exports.globalState = globalState;
