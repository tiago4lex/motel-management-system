const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty'
});

async function initializeDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database conectado com sucesso');
    
    // Testar conexão
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    logger.info('✅ Database testado com sucesso');
    
    return true;
  } catch (error) {
    logger.error('❌ Erro ao conectar ao database:', error);
    throw error;
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database desconectado');
}

module.exports = {
  prisma,
  initializeDatabase,
  disconnectDatabase
};