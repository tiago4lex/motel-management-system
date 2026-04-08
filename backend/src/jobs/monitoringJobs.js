const cron = require('node-cron');
const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

class MonitoringJobs {
  start() {
    // Verificar estoque baixo a cada hora
    cron.schedule('0 * * * *', async () => {
      try {
        const lowStockProducts = await prisma.product.findMany({
          where: {
            stockControlled: true,
            stockQuantity: {
              lte: prisma.product.fields.minStockAlert
            }
          }
        });
        
        if (lowStockProducts.length > 0) {
          logger.warn(`Produtos com estoque baixo: ${lowStockProducts.length}`);
          // Aqui pode enviar email ou notificação
        }
      } catch (error) {
        logger.error('Erro ao verificar estoque baixo:', error);
      }
    });
    
    // Limpar reservas antigas a cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const result = await prisma.booking.updateMany({
          where: {
            status: 'COMPLETED',
            endTime: {
              lt: sevenDaysAgo
            }
          },
          data: {
            // Marcar para arquivamento ou apenas manter como histórico
          }
        });
        
        logger.info(`Limpeza de registros antigos: ${result.count} reservas processadas`);
      } catch (error) {
        logger.error('Erro na limpeza de registros:', error);
      }
    });
    
    // Gerar relatório diário à meia-noite
    cron.schedule('0 0 * * *', async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dailyReport = await prisma.booking.aggregate({
          where: {
            createdAt: {
              gte: new Date(yesterday.setHours(0, 0, 0)),
              lt: new Date(yesterday.setHours(23, 59, 59))
            },
            status: 'COMPLETED'
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        });
        
        logger.info(`Relatório diário gerado: ${dailyReport._count} reservas, Total: R$ ${dailyReport._sum.totalAmount || 0}`);
      } catch (error) {
        logger.error('Erro ao gerar relatório diário:', error);
      }
    });
  }
}

module.exports = new MonitoringJobs();