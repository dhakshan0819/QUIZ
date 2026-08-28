const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configure SQLite for high concurrency (400+ concurrent students on LAN)
async function initDbOptimizations() {
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
}

initDbOptimizations();

module.exports = prisma;