const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main(){
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'sample_questions.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const questions = JSON.parse(raw);

  console.log('Seeding questions:', questions.length);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Partition 10 questions per quiz by default (Quiz 1, Quiz 2, Quiz 3, etc.)
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

  console.log('Done seeding.');
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = main;