const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main(){
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'sample_questions.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const questions = JSON.parse(raw);

  console.log('Seeding questions:', questions.length);

  for(const q of questions){
    await prisma.question.upsert({
      where: { id: q.id || 0 },
      update: {
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
        points: q.points || 10
      },
      create: {
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
        points: q.points || 10
      }
    });
  }

  console.log('Done seeding.');
  await prisma.$disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });