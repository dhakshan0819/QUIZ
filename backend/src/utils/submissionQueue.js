let prismaClient = null;
const queue = [];
const answeredSet = new Set();
const studentScores = new Map();
const answeredCache = new Map(); // key -> { isCorrect }
let flushInterval = null;
let isFlushing = false;

async function init(prisma) {
  prismaClient = prisma;

  try {
    // 1. Populate in-memory answered set from existing DB records
    const answers = await prisma.answer.findMany({
      select: { studentId: true, questionId: true, correct: true }
    });
    for (const a of answers) {
      const key = `${a.studentId}_${a.questionId}`;
      answeredSet.add(key);
      answeredCache.set(key, { isCorrect: a.correct });
    }

    // 2. Populate in-memory student scores
    const students = await prisma.student.findMany({
      select: { id: true, score: true }
    });
    for (const s of students) {
      studentScores.set(s.id, s.score || 0);
    }
  } catch (err) {
    console.error('Failed to initialize submission queue cache from DB:', err.message);
  }

  if (!flushInterval) {
    flushInterval = setInterval(flushBatch, 100); // Flush queue every 100ms
  }
}

/**
 * Handle instant submission in-memory (< 1ms)
 */
function handleSubmission({ student, question, option, timeMs }) {
  const key = `${student.id}_${question.id}`;

  // If student score is not yet cached in memory, initialize it
  if (!studentScores.has(student.id)) {
    studentScores.set(student.id, student.score || 0);
  }

  // 1. Instant Deduplication check
  if (answeredSet.has(key)) {
    const cached = answeredCache.get(key) || { isCorrect: false };
    return {
      isDuplicate: true,
      isCorrect: cached.isCorrect,
      pointsAwarded: 0,
      totalScore: studentScores.get(student.id) || 0
    };
  }

  // 2. Mark as answered immediately in memory
  const isCorrect = question.correct === option;
  const points = isCorrect ? (question.points || 10) : 0;

  answeredSet.add(key);
  answeredCache.set(key, { isCorrect });

  // 3. Update in-memory score instantly
  const updatedScore = (studentScores.get(student.id) || 0) + points;
  studentScores.set(student.id, updatedScore);

  // 4. Push to background queue
  queue.push({
    studentId: student.id,
    questionId: question.id,
    option,
    correct: isCorrect,
    timeMs: timeMs || 0,
    points
  });

  return {
    isDuplicate: false,
    isCorrect,
    pointsAwarded: points,
    totalScore: updatedScore
  };
}

/**
 * Background batch flusher to execute single bulk write
 */
async function flushBatch() {
  if (isFlushing || queue.length === 0 || !prismaClient) return;
  isFlushing = true;

  const batch = queue.splice(0, queue.length);

  try {
    const answerRows = batch.map(b => ({
      studentId: b.studentId,
      questionId: b.questionId,
      option: b.option,
      correct: b.correct,
      timeMs: b.timeMs,
      scored: true
    }));

    // 1. Bulk insert all answers in one batch
    try {
      await prismaClient.answer.createMany({
        data: answerRows
      });
    } catch {
      // Fallback for individual rows if any constraint conflict
      for (const row of answerRows) {
        await prismaClient.answer.create({ data: row }).catch(() => {});
      }
    }

    // 2. Aggregate score increments per student and update in DB
    const studentIncrements = {};
    for (const item of batch) {
      if (item.correct && item.points > 0) {
        studentIncrements[item.studentId] = (studentIncrements[item.studentId] || 0) + item.points;
      }
    }

    for (const [studentIdStr, points] of Object.entries(studentIncrements)) {
      const studentId = Number(studentIdStr);
      await prismaClient.student.update({
        where: { id: studentId },
        data: { score: { increment: points } }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Batch submission flush error:', err);
  } finally {
    isFlushing = false;
  }
}

function clearCache() {
  queue.length = 0;
  answeredSet.clear();
  answeredCache.clear();
  studentScores.clear();
}

function getStudentScore(studentId, defaultScore = 0) {
  return studentScores.get(studentId) ?? defaultScore;
}

module.exports = {
  init,
  handleSubmission,
  flushBatch,
  clearCache,
  getStudentScore
};
