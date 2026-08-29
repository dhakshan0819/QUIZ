const express = require('express');
const router = express.Router();
const prisma = require('../db');
const submissionQueue = require('../utils/submissionQueue');

// In-memory global state for the quiz
const globalState = {
  quizStarted: false,
  activeQuizNumber: 1,
  currentQuestionIndex: 1,
  showLeaderboardOverlay: false,
  answerTimeLimit: 15,  // 15 seconds
  previewTimeLimit: 5   // 5 seconds
};

// In-memory question cache by quiz number for zero-latency response under high load
let questionCacheByQuiz = null;

async function loadQuestionCache() {
  try {
    const questions = await prisma.question.findMany({ orderBy: { id: 'asc' } });
    const cache = {};
    for (const q of questions) {
      const qNum = q.quizNumber || 1;
      if (!cache[qNum]) cache[qNum] = [];
      cache[qNum].push(q);
    }
    questionCacheByQuiz = cache;
    return cache;
  } catch (err) {
    console.error('Failed to load question cache:', err.message);
    return questionCacheByQuiz || {};
  }
}

async function getQuestionsForQuiz(quizNum) {
  if (!questionCacheByQuiz) {
    await loadQuestionCache();
  }
  return (questionCacheByQuiz && questionCacheByQuiz[quizNum]) ? questionCacheByQuiz[quizNum] : [];
}

async function findQuestionById(questionId) {
  if (!questionCacheByQuiz) {
    await loadQuestionCache();
  }
  if (questionCacheByQuiz) {
    for (const qList of Object.values(questionCacheByQuiz)) {
      const found = qList.find(q => q.id === questionId);
      if (found) return found;
    }
  }
  return await prisma.question.findUnique({ where: { id: Number(questionId) } });
}

function invalidateQuestionCache() {
  questionCacheByQuiz = null;
}

// Get global quiz status and active configuration
router.get('/status', (req, res) => {
  res.json({
    quizStarted: globalState.quizStarted,
    activeQuizNumber: globalState.activeQuizNumber,
    currentQuestionIndex: globalState.currentQuestionIndex,
    showLeaderboardOverlay: globalState.showLeaderboardOverlay,
    answerTimeLimit: globalState.answerTimeLimit,
    previewTimeLimit: globalState.previewTimeLimit
  });
});

// Update timing settings
router.post('/settings', (req, res) => {
  const { answerTimeLimit, previewTimeLimit } = req.body || {};
  if (answerTimeLimit && Number(answerTimeLimit) > 0) {
    globalState.answerTimeLimit = Number(answerTimeLimit);
  }
  if (previewTimeLimit && Number(previewTimeLimit) > 0) {
    globalState.previewTimeLimit = Number(previewTimeLimit);
  }
  res.json({
    success: true,
    answerTimeLimit: globalState.answerTimeLimit,
    previewTimeLimit: globalState.previewTimeLimit
  });
});

// Admin endpoint to start a specific quiz globally
router.post('/start', async (req, res) => {
  const { quizNumber } = req.body || {};
  if (quizNumber && Number(quizNumber) > 0) {
    globalState.activeQuizNumber = Number(quizNumber);
  }
  globalState.quizStarted = true;
  globalState.currentQuestionIndex = 1;
  globalState.showLeaderboardOverlay = false;
  res.json({ 
    success: true, 
    quizStarted: true, 
    activeQuizNumber: globalState.activeQuizNumber,
    currentQuestionIndex: globalState.currentQuestionIndex,
    showLeaderboardOverlay: globalState.showLeaderboardOverlay,
    answerTimeLimit: globalState.answerTimeLimit,
    previewTimeLimit: globalState.previewTimeLimit
  });
});

// Admin endpoint to stop the active quiz
router.post('/stop', async (req, res) => {
  globalState.quizStarted = false;
  globalState.showLeaderboardOverlay = false;
  res.json({ 
    success: true, 
    quizStarted: false, 
    activeQuizNumber: globalState.activeQuizNumber,
    showLeaderboardOverlay: false
  });
});

// Admin endpoint to advance to next question
router.post('/next-question', async (req, res) => {
  globalState.currentQuestionIndex += 1;
  globalState.showLeaderboardOverlay = false;
  res.json({
    success: true,
    activeQuizNumber: globalState.activeQuizNumber,
    currentQuestionIndex: globalState.currentQuestionIndex,
    showLeaderboardOverlay: false
  });
});

// Admin endpoint to toggle broadcast leaderboard
router.post('/toggle-leaderboard', async (req, res) => {
  const { show } = req.body || {};
  if (show !== undefined) {
    globalState.showLeaderboardOverlay = Boolean(show);
  } else {
    globalState.showLeaderboardOverlay = !globalState.showLeaderboardOverlay;
  }
  res.json({
    success: true,
    showLeaderboardOverlay: globalState.showLeaderboardOverlay
  });
});

// Get list of currently locked students
router.get('/locked-students', (req, res) => {
  const { getLockedStudents } = require('../socket');
  const locked = getLockedStudents ? getLockedStudents() : {};
  res.json({ lockedStudents: locked });
});

// Unlock a student
router.post('/unlock-student', (req, res) => {
  const { registerNumber } = req.body || {};
  if (!registerNumber) return res.status(400).json({ error: 'registerNumber required' });
  const { unlockStudent } = require('../socket');
  if (unlockStudent) unlockStudent(registerNumber);
  res.json({ success: true, registerNumber, unlocked: true });
});

// Get summary of all quizzes (Quiz 1, Quiz 2, Quiz 3, etc.) with question counts
router.get('/quizzes', async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true, quizNumber: true }
    });

    const quizMap = {};
    for (const q of questions) {
      const qNum = q.quizNumber || 1;
      if (!quizMap[qNum]) {
        quizMap[qNum] = { quizNumber: qNum, title: `Quiz ${qNum}`, count: 0 };
      }
      quizMap[qNum].count++;
    }

    const quizzes = Object.values(quizMap).sort((a, b) => a.quizNumber - b.quizNumber);
    if (quizzes.length === 0) {
      quizzes.push({ quizNumber: 1, title: 'Quiz 1', count: 0 });
    }

    res.json({
      quizzes,
      activeQuizNumber: globalState.activeQuizNumber,
      quizStarted: globalState.quizStarted,
      answerTimeLimit: globalState.answerTimeLimit,
      previewTimeLimit: globalState.previewTimeLimit
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes: ' + err.message });
  }
});

// Get questions for a specific quiz (or all)
router.get('/questions', async (req, res) => {
  try {
    const { quizNumber } = req.query;
    const where = {};
    if (quizNumber) where.quizNumber = Number(quizNumber);
    const questions = await prisma.question.findMany({ where, orderBy: { id: 'asc' } });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Delete a question by ID
router.delete('/questions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.answer.deleteMany({ where: { questionId: id } });
    await prisma.question.delete({ where: { id } });
    invalidateQuestionCache();
    res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Upload and partition questions in JSON format
router.post('/upload', async (req, res) => {
  try {
    let { questions, partitionCount, questionsPerQuiz, partitionMode, targetQuizNumber, mode } = req.body || {};
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided or invalid format. Please provide a JSON array.' });
    }

    const validQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correct) {
        return res.status(400).json({ 
          error: `Question #${i + 1} is missing required fields (question, optionA, optionB, optionC, optionD, correct).` 
        });
      }

      validQuestions.push({
        category: String(q.category || 'General').trim(),
        difficulty: String(q.difficulty || 'Medium').trim(),
        question: String(q.question).trim(),
        optionA: String(q.optionA).trim(),
        optionB: String(q.optionB).trim(),
        optionC: String(q.optionC).trim(),
        optionD: String(q.optionD).trim(),
        correct: String(q.correct).trim().toUpperCase(),
        hint: q.hint ? String(q.hint).trim() : null,
        explanation: q.explanation ? String(q.explanation).trim() : null,
        fact: q.fact ? String(q.fact).trim() : null,
        points: Number(q.points) || 10,
        quizNumber: q.quizNumber ? Number(q.quizNumber) : null
      });
    }

    // Determine target quiz partitioning
    if (partitionMode === 'count' && partitionCount && Number(partitionCount) > 0) {
      const totalQuizzes = Math.max(1, Number(partitionCount));
      const perQuiz = Math.ceil(validQuestions.length / totalQuizzes);
      validQuestions.forEach((q, idx) => {
        q.quizNumber = Math.floor(idx / perQuiz) + 1;
      });
    } else if (partitionMode === 'perQuiz' && questionsPerQuiz && Number(questionsPerQuiz) > 0) {
      const perQuiz = Math.max(1, Number(questionsPerQuiz));
      validQuestions.forEach((q, idx) => {
        q.quizNumber = Math.floor(idx / perQuiz) + 1;
      });
    } else if (partitionMode === 'single' && targetQuizNumber && Number(targetQuizNumber) > 0) {
      const tNum = Number(targetQuizNumber);
      validQuestions.forEach(q => { q.quizNumber = tNum; });
    } else if (partitionCount && Number(partitionCount) > 0) {
      const totalQuizzes = Math.max(1, Number(partitionCount));
      const perQuiz = Math.ceil(validQuestions.length / totalQuizzes);
      validQuestions.forEach((q, idx) => {
        q.quizNumber = Math.floor(idx / perQuiz) + 1;
      });
    } else if (questionsPerQuiz && Number(questionsPerQuiz) > 0) {
      const perQuiz = Math.max(1, Number(questionsPerQuiz));
      validQuestions.forEach((q, idx) => {
        q.quizNumber = Math.floor(idx / perQuiz) + 1;
      });
    } else {
      const perQuiz = 10;
      validQuestions.forEach((q, idx) => {
        q.quizNumber = q.quizNumber || (Math.floor(idx / perQuiz) + 1);
      });
    }

    if (mode === 'replace') {
      await prisma.answer.deleteMany({});
      await prisma.question.deleteMany({});
    }

    for (const q of validQuestions) {
      await prisma.question.create({
        data: {
          quizNumber: q.quizNumber,
          category: q.category,
          difficulty: q.difficulty,
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correct: q.correct,
          hint: q.hint,
          explanation: q.explanation,
          fact: q.fact,
          points: q.points
        }
      });
    }

    invalidateQuestionCache();
    await loadQuestionCache();

    const allQ = await prisma.question.findMany({ select: { quizNumber: true } });
    const counts = {};
    for (const q of allQ) {
      counts[q.quizNumber] = (counts[q.quizNumber] || 0) + 1;
    }

    res.json({
      success: true,
      uploadedCount: validQuestions.length,
      quizDistribution: counts,
      message: `Successfully uploaded ${validQuestions.length} questions partitioned into ${Object.keys(counts).length} quizzes.`
    });
  } catch (err) {
    console.error('Upload questions error:', err);
    res.status(500).json({ error: 'Failed to process question upload: ' + err.message });
  }
});

// Repartition existing questions across N quizzes
router.post('/repartition', async (req, res) => {
  try {
    const { partitionCount, questionsPerQuiz } = req.body || {};
    const questions = await prisma.question.findMany({ orderBy: { id: 'asc' } });
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions in database to partition.' });
    }

    let perQuiz = 10;
    if (partitionCount && Number(partitionCount) > 0) {
      perQuiz = Math.ceil(questions.length / Number(partitionCount));
    } else if (questionsPerQuiz && Number(questionsPerQuiz) > 0) {
      perQuiz = Number(questionsPerQuiz);
    }

    for (let i = 0; i < questions.length; i++) {
      const newQuizNum = Math.floor(i / perQuiz) + 1;
      await prisma.question.update({
        where: { id: questions[i].id },
        data: { quizNumber: newQuizNum }
      });
    }

    invalidateQuestionCache();
    await loadQuestionCache();

    const allQ = await prisma.question.findMany({ select: { quizNumber: true } });
    const counts = {};
    for (const q of allQ) {
      counts[q.quizNumber] = (counts[q.quizNumber] || 0) + 1;
    }

    res.json({
      success: true,
      message: `Successfully repartitioned ${questions.length} questions into ${Object.keys(counts).length} quizzes.`,
      quizDistribution: counts
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to repartition questions: ' + err.message });
  }
});

// Admin endpoint for complete system hard reset
router.post('/hard-reset', async (req, res) => {
  globalState.quizStarted = false;
  try {
    submissionQueue.clearCache();
    invalidateQuestionCache();
    await prisma.answer.deleteMany({});
    await prisma.student.deleteMany({});
    res.json({ success: true, message: 'Database wiped successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to wipe database.' });
  }
});

// Get the next unanswered question for a student in the ACTIVE QUIZ (Fast, in-memory filtering)
router.get('/next', async (req, res) => {
  const { registerNumber } = req.query;
  
  if (!globalState.quizStarted) {
    return res.json({ 
      quizStarted: false, 
      activeQuizNumber: globalState.activeQuizNumber 
    });
  }

  if (!registerNumber) {
    return res.status(400).json({ error: 'registerNumber required' });
  }

  const { isStudentLocked, getLockedReason } = require('../socket');
  if (isStudentLocked && isStudentLocked(registerNumber)) {
    return res.json({
      quizStarted: true,
      locked: true,
      lockReason: getLockedReason(registerNumber) || 'Anti-cheat lock active. Awaiting host approval.',
      activeQuizNumber: globalState.activeQuizNumber
    });
  }

  const student = await submissionQueue.getStudent(registerNumber);
  if (!student) {
    return res.status(404).json({ error: 'student not found' });
  }

  const currentQuizNum = globalState.activeQuizNumber;
  const currentLiveScore = submissionQueue.getStudentScore(student.id, student.score);

  const quizQuestions = await getQuestionsForQuiz(currentQuizNum);

  if (!quizQuestions || quizQuestions.length === 0) {
    return res.json({ 
      quizStarted: true, 
      complete: true, 
      activeQuizNumber: currentQuizNum,
      message: `No questions found in Quiz ${currentQuizNum}`
    });
  }

  // Filter available questions using in-memory answer cache
  const availableQuestions = quizQuestions.filter(q => !submissionQueue.hasAnswered(student.id, q.id));
  const answeredCount = quizQuestions.length - availableQuestions.length;

  if (availableQuestions.length === 0) {
    return res.json({ 
      quizStarted: true, 
      complete: true, 
      activeQuizNumber: currentQuizNum,
      totalQuestions: quizQuestions.length,
      answeredCount,
      totalScore: currentLiveScore
    });
  }

  // Pick a random question from available questions
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const nextQuestion = availableQuestions[randomIndex];

  const { correct, explanation, fact, ...safeQuestion } = nextQuestion;

  const totalQuestions = quizQuestions.length;
  const currentQuestionNumber = Math.min(totalQuestions, answeredCount + 1);

  res.json({ 
    quizStarted: true, 
    complete: false, 
    activeQuizNumber: currentQuizNum,
    answerTimeLimit: globalState.answerTimeLimit,
    previewTimeLimit: globalState.previewTimeLimit,
    question: safeQuestion,
    totalScore: currentLiveScore,
    progress: { 
      current: currentQuestionNumber, 
      total: totalQuestions, 
      quizNumber: currentQuizNum 
    }

    if (!registerNumber) {
      return res.status(400).json({ error: 'registerNumber required' });
    }

    const { isStudentLocked, getLockedReason } = require('../socket');
    if (isStudentLocked && isStudentLocked(registerNumber)) {
      return res.json({
        quizStarted: true,
        locked: true,
        lockReason: getLockedReason(registerNumber) || 'Anti-cheat lock active. Awaiting host approval.',
        activeQuizNumber: globalState.activeQuizNumber
      });
    }

    let student = quizCache.getStudentByRegister(registerNumber);
    if (!student) {
      student = await prisma.student.findUnique({ where: { registerNumber } }).catch(() => null);
      if (student) quizCache.cacheStudent(student);
    }

    if (!student) {
      return res.status(404).json({ error: 'student not found' });
    }

    const currentQuizNum = globalState.activeQuizNumber;
    const currentLiveScore = submissionQueue.getStudentScore(student.id, student.score || 0);

    // Fast RAM lookup for quiz questions
    let quizQuestions = quizCache.getQuestionsForQuiz(currentQuizNum);
    if (quizQuestions.length === 0) {
      quizQuestions = quizCache.getQuestionsForQuiz(1); // fallback to quiz 1
    }

    if (quizQuestions.length === 0) {
      return res.json({ 
        quizStarted: true, 
        complete: true, 
        activeQuizNumber: currentQuizNum,
        message: `No questions found in Quiz ${currentQuizNum}`
      });
    }

    const answeredSet = quizCache.getAnsweredQuestionIds(student.id);
    const availableQuestions = quizQuestions.filter(q => !answeredSet.has(q.id));

    if (availableQuestions.length === 0) {
      return res.json({ 
        quizStarted: true, 
        complete: true, 
        activeQuizNumber: currentQuizNum,
        totalQuestions: quizQuestions.length,
        answeredCount: quizQuestions.length,
        totalScore: currentLiveScore
      });
    }

    // Pick a random question ID from available questions in this quiz
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const nextQuestion = availableQuestions[randomIndex];

    // Remove correct answer before sending to client
    const { correct, explanation, fact, ...safeQuestion } = nextQuestion;

    const totalQuestions = quizQuestions.length;
    const currentQuestionNumber = Math.min(totalQuestions, (totalQuestions - availableQuestions.length) + 1);

    res.json({ 
      quizStarted: true, 
      complete: false, 
      activeQuizNumber: currentQuizNum,
      answerTimeLimit: globalState.answerTimeLimit,
      previewTimeLimit: globalState.previewTimeLimit,
      question: safeQuestion,
      totalScore: currentLiveScore,
      progress: { 
        current: currentQuestionNumber, 
        total: totalQuestions, 
        quizNumber: currentQuizNum 
      }
    });
  } catch (err) {
    console.error('Error in /quiz/next:', err);
    res.status(500).json({ error: 'Failed to retrieve next question' });
  }
});

// Submit an answer (Ultra-fast in-memory processing with batch queueing)
router.post('/submit', async (req, res) => {
  const { registerNumber, questionId, option, timeMs } = req.body || {};
  
  if (!globalState.quizStarted) {
    return res.status(400).json({ error: 'Quiz has not started' });
  }

    if (!registerNumber || !questionId || !option) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { isStudentLocked, getLockedReason } = require('../socket');
    if (isStudentLocked && isStudentLocked(registerNumber)) {
      return res.status(403).json({ 
        error: 'Your screen is locked due to an anti-cheat violation. You cannot submit answers until the host unlocks your screen.',
        locked: true,
        reason: getLockedReason(registerNumber)
      });
    }

    let student = quizCache.getStudentByRegister(registerNumber);
    if (!student) {
      student = await prisma.student.findUnique({ where: { registerNumber } }).catch(() => null);
      if (student) quizCache.cacheStudent(student);
    }
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let question = quizCache.getQuestion(questionId);
    if (!question) {
      question = await prisma.question.findUnique({ where: { id: Number(questionId) } }).catch(() => null);
    }
    if (!question) return res.status(404).json({ error: 'Question not found' });

    quizCache.markQuestionAnswered(student.id, question.id);

    // Process submission instantly in-memory (< 1ms) and queue for batch write
    const result = submissionQueue.handleSubmission({
      student,
      question,
      option,
      timeMs
    });

    return res.json({
      success: true,
      correct: question.correct,
      explanation: question.explanation,
      fact: question.fact,
      isCorrect: result.isCorrect,
      previewTimeLimit: globalState.previewTimeLimit,
      pointsAwarded: result.pointsAwarded,
      totalScore: result.totalScore,
      alreadyAnswered: result.isDuplicate
    });
  } catch (err) {
    console.error('Error in /quiz/submit:', err);
    res.status(500).json({ error: 'Submission processing error' });
  }

  const student = await submissionQueue.getStudent(registerNumber);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const question = await findQuestionById(questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  // Process submission instantly in-memory (< 1ms) and queue for batch write
  const result = submissionQueue.handleSubmission({
    student,
    question,
    option,
    timeMs
  });

  return res.json({
    success: true,
    correct: question.correct,
    explanation: question.explanation,
    fact: question.fact,
    isCorrect: result.isCorrect,
    previewTimeLimit: globalState.previewTimeLimit,
    pointsAwarded: result.pointsAwarded,
    totalScore: result.totalScore,
    alreadyAnswered: result.isDuplicate
  });
});

module.exports = router;
module.exports.globalState = globalState;
