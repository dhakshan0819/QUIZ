const fs = require('fs');
const path = require('path');

// In-Memory Fast Caches for 500+ Concurrent Students
const studentByRegister = new Map(); // registerNumber -> studentObj
const studentById = new Map();       // studentId -> studentObj
const questionsMap = new Map();      // questionId -> questionObj
const questionsByQuiz = new Map();   // quizNumber -> Question[]
const studentAnsweredSets = new Map();// studentId -> Set<questionId>

let prismaClient = null;

async function init(prisma) {
  prismaClient = prisma;
  await reloadCache();
}

async function reloadCache() {
  if (!prismaClient) return;
  try {
    // 1. Load All Questions into RAM
    let questions = await prismaClient.question.findMany().catch(() => []);
    if (questions.length === 0) {
      // Load from sample_questions.json if DB questions query returned 0
      const dataPath = path.join(__dirname, '..', '..', 'sample_questions.json');
      if (fs.existsSync(dataPath)) {
        try {
          questions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (e) {}
      }
    }

    questionsMap.clear();
    questionsByQuiz.clear();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const id = q.id || (i + 1);
      const quizNum = q.quizNumber || (Math.floor(i / 10) + 1);
      const fullQ = { ...q, id, quizNumber: quizNum };
      questionsMap.set(id, fullQ);

      if (!questionsByQuiz.has(quizNum)) {
        questionsByQuiz.set(quizNum, []);
      }
      questionsByQuiz.get(quizNum).push(fullQ);
    }

    // 2. Load All Students into RAM
    const students = await prismaClient.student.findMany().catch(() => []);
    studentByRegister.clear();
    studentById.clear();
    for (const s of students) {
      studentByRegister.set(s.registerNumber, s);
      studentById.set(s.id, s);
    }

    // 3. Load All Past Answers into RAM
    const answers = await prismaClient.answer.findMany({
      select: { studentId: true, questionId: true }
    }).catch(() => []);
    studentAnsweredSets.clear();
    for (const a of answers) {
      if (!studentAnsweredSets.has(a.studentId)) {
        studentAnsweredSets.set(a.studentId, new Set());
      }
      studentAnsweredSets.get(a.studentId).add(a.questionId);
    }

    console.log(`Quiz cache active in RAM: ${questionsMap.size} questions, ${studentById.size} students, ${answers.length} answers.`);
  } catch (err) {
    console.warn('QuizCache reload warning:', err.message);
  }
}

function getStudentByRegister(registerNumber) {
  if (!registerNumber) return null;
  return studentByRegister.get(registerNumber) || null;
}

function getStudentById(id) {
  return studentById.get(Number(id)) || null;
}

function cacheStudent(student) {
  if (!student) return;
  studentByRegister.set(student.registerNumber, student);
  studentById.set(student.id, student);
}

function removeStudent(registerNumber) {
  const s = studentByRegister.get(registerNumber);
  if (s) {
    studentById.delete(s.id);
    studentAnsweredSets.delete(s.id);
    studentByRegister.delete(registerNumber);
  }
}

function getAllStudents() {
  return Array.from(studentById.values());
}

function getQuestion(id) {
  return questionsMap.get(Number(id)) || null;
}

function getQuestionsForQuiz(quizNumber) {
  return questionsByQuiz.get(Number(quizNumber)) || [];
}

function getAnsweredQuestionIds(studentId) {
  return studentAnsweredSets.get(Number(studentId)) || new Set();
}

function markQuestionAnswered(studentId, questionId) {
  const sId = Number(studentId);
  const qId = Number(questionId);
  if (!studentAnsweredSets.has(sId)) {
    studentAnsweredSets.set(sId, new Set());
  }
  studentAnsweredSets.get(sId).add(qId);
}

function clearAllData() {
  studentByRegister.clear();
  studentById.clear();
  studentAnsweredSets.clear();
}

module.exports = {
  init,
  reloadCache,
  getStudentByRegister,
  getStudentById,
  cacheStudent,
  removeStudent,
  getAllStudents,
  getQuestion,
  getQuestionsForQuiz,
  getAnsweredQuestionIds,
  markQuestionAnswered,
  clearAllData
};
