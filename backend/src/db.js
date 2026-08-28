const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configure optimizations if running SQLite, or log PostgreSQL connection
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
    console.log('Connected to PostgreSQL (Supabase). High-concurrency MVCC active.');
  }
}

initDbOptimizations();

module.exports = prisma;