const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Configure optimizations & auto-create tables if missing
async function initDbOptimizations() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) {
    try {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
      console.log('SQLite WAL mode & high-concurrency PRAGMAs active (400+ user ready).');
    } catch (e) {
      console.warn('SQLite PRAGMA init warning:', e.message);
    }
  } else {
    console.log('Connected to PostgreSQL. Ensuring tables exist...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Student" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "registerNumber" TEXT UNIQUE NOT NULL,
          "department" TEXT NOT NULL DEFAULT '',
          "year" TEXT NOT NULL DEFAULT '',
          "section" TEXT NOT NULL DEFAULT '',
          "score" INTEGER NOT NULL DEFAULT 0,
          "connected" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Question" (
          "id" SERIAL PRIMARY KEY,
          "quizNumber" INTEGER NOT NULL DEFAULT 1,
          "category" TEXT NOT NULL DEFAULT 'General',
          "difficulty" TEXT NOT NULL DEFAULT 'Medium',
          "question" TEXT NOT NULL,
          "optionA" TEXT NOT NULL,
          "optionB" TEXT NOT NULL,
          "optionC" TEXT NOT NULL,
          "optionD" TEXT NOT NULL,
          "correct" TEXT NOT NULL,
          "hint" TEXT,
          "explanation" TEXT,
          "fact" TEXT,
          "points" INTEGER NOT NULL DEFAULT 10
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Team" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Answer" (
          "id" SERIAL PRIMARY KEY,
          "studentId" INTEGER NOT NULL,
          "questionId" INTEGER NOT NULL,
          "option" TEXT NOT NULL,
          "correct" BOOLEAN NOT NULL,
          "timeMs" INTEGER,
          "scored" BOOLEAN NOT NULL DEFAULT false,
          CONSTRAINT "Answer_studentId_questionId_key" UNIQUE ("studentId", "questionId")
        );
      `);
      console.log('PostgreSQL database tables verified ✓');

      // Auto-seed questions if empty
      const qCount = await prisma.question.count().catch(() => 0);
      if (qCount === 0) {
        console.log('Seeding initial 40 questions...');
        const dataPath = path.join(__dirname, '..', 'sample_questions.json');
        if (fs.existsSync(dataPath)) {
          const questions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const quizNumber = q.quizNumber || (Math.floor(i / 10) + 1);
            await prisma.question.upsert({
              where: { id: q.id || (i + 1) },
              update: {
                quizNumber,
                category: q.category || 'General',
                difficulty: q.difficulty || 'Medium',
                question: q.question,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correct: q.correct,
                hint: q.hint,
                explanation: q.explanation,
                fact: q.fact,
                points: q.points || 10
              },
              create: {
                quizNumber,
                category: q.category || 'General',
                difficulty: q.difficulty || 'Medium',
                question: q.question,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correct: q.correct,
                hint: q.hint,
                explanation: q.explanation,
                fact: q.fact,
                points: q.points || 10
              }
            });
          }
          console.log(`Seeded ${questions.length} questions ✓`);
        }
      }
    } catch (e) {
      console.warn('PostgreSQL table check warning:', e.message);
    }
  }
}

initDbOptimizations();

module.exports = prisma;