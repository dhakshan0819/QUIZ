const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

async function initDbOptimizations() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) {
    try {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
      console.log('SQLite WAL mode & high-concurrency PRAGMAs active.');
    } catch (e) {
      console.warn('SQLite PRAGMA init warning:', e.message);
    }
  } else {
    console.log('Connected to PostgreSQL (Supabase). Verifying tables & initial question seed...');
    try {
      // Auto-seed sample questions if Question table is empty
      const qCount = await prisma.question.count().catch(() => 0);
      if (qCount === 0) {
        console.log('Seeding initial questions...');
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
          console.log(`Seeded ${questions.length} initial questions ✓`);
        }
      }
    } catch (e) {
      console.warn('PostgreSQL DB initialization note:', e.message);
    }
  }
}

initDbOptimizations();

module.exports = prisma;