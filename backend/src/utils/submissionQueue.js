let prismaClient = null;
const queue = [];
const answeredSet = new Set();
const studentScores = new Map();
const answeredCache = new Map(); // key -> { isCorrect }
const studentRegMap = new Map(); // registerNumber -> student object

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

    // 2. Populate in-memory student scores and student lookup map
    const students = await prisma.student.findMany();
    for (const s of students) {
      studentScores.set(s.id, s.score || 0);
      studentRegMap.set(s.registerNumber, s);
    }
    console.log(`SubmissionQueue initialized: ${students.length} students, ${answers.length} answers cached.`);
  } catch (err) {
    console.error('Failed to initialize submission queue cache from DB:', err.message);
  }

  if (!flushInterval) {
    flushInterval = setInterval(flushBatch, 100); // Flush queue every 100ms
  }
}

function cacheStudent(student) {
  if (!student) return;
  studentRegMap.set(student.registerNumber, student);
  studentScores.set(student.id, student.score || 0);
}

function removeStudentFromCache(registerNumber) {
  const student = studentRegMap.get(registerNumber);
  if (student) {
    studentScores.delete(student.id);
    studentRegMap.delete(registerNumber);
  }
}

async function getStudent(registerNumber) {
  if (!registerNumber) return null;
  const regKey = String(registerNumber).trim();
  if (studentRegMap.has(regKey)) {
    return studentRegMap.get(regKey);
  }
  if (!prismaClient) return null;
  const student = await prismaClient.student.findUnique({ where: { registerNumber: regKey } });
  if (student) {
    cacheStudent(student);
  }
  return student;
}

function hasAnswered(studentId, questionId) {
  return answeredSet.has(`${studentId}_${questionId}`);
}

/**
 * Handle instant submission in-memory (< 1ms)
 */
function handleSubmission({ student, question, option, timeMs }) {
  const key = `${student.id}_${question.id}`;

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

  // 2. Mark as answered immediately in memory (Case-insensitive check)
  const normCorrect = String(question.correct || '').trim().toUpperCase();
  const normOption = String(option || '').trim().toUpperCase();
  const isCorrect = normCorrect === normOption;
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
    option: String(option || 'TIMEOUT').trim(),
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

    // 1. Bulk insert all answers in one batch with duplicate skipping
    try {
      await prismaClient.answer.createMany({
        data: answerRows,
        skipDuplicates: true
      });
    } catch {
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
    console.error('Batch submission flush error:', err.message);
  } finally {
    isFlushing = false;
  }
}

function clearCache() {
  queue.length = 0;
  answeredSet.clear();
  answeredCache.clear();
  studentScores.clear();
  studentRegMap.clear();
}

function clearAnsweredCache() {
  answeredSet.clear();
  answeredCache.clear();
}

function getStudentScore(studentId, defaultScore = 0) {
  return studentScores.get(studentId) ?? defaultScore;
}

module.exports = {
  init,
  cacheStudent,
  removeStudentFromCache,
  getStudent,
  hasAnswered,
  handleSubmission,
  flushBatch,
  clearCache,
  clearAnsweredCache,
  getStudentScore
};
