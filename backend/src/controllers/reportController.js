const { prisma } = require('../config/database');
const ExcelJS = require('exceljs');

class ReportController {
  
  // Dashboard de métricas principais
  async getDashboardMetrics(req, res, next) {
    try {
      console.log('📊 Dashboard metrics called');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Métricas do dia
      const todayBookings = await prisma.booking.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true },
        _count: true
      });
      
      // Métricas da semana
      const weekBookings = await prisma.booking.aggregate({
        where: {
          createdAt: { gte: startOfWeek },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true },
        _count: true
      });
      
      // Métricas do mês
      const monthBookings = await prisma.booking.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true },
        _count: true
      });
      
      // Consumos do dia
      const todayConsumptions = await prisma.consumption.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow }
        },
        _sum: { totalPrice: true }
      });
      
      // Taxa de ocupação atual
      const totalRooms = await prisma.room.count();
      const occupiedRooms = await prisma.room.count({
        where: { status: 'OCCUPIED' }
      });
      
      res.json({
        success: true,
        data: {
          today: {
            revenue: todayBookings._sum.totalAmount || 0,
            bookings: todayBookings._count || 0,
            consumptions: todayConsumptions._sum.totalPrice || 0
          },
          week: {
            revenue: weekBookings._sum.totalAmount || 0,
            bookings: weekBookings._count || 0
          },
          month: {
            revenue: monthBookings._sum.totalAmount || 0,
            bookings: monthBookings._count || 0
          },
          occupancy: {
            total: totalRooms,
            occupied: occupiedRooms,
            percentage: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
          },
          topProducts: [],
          topRooms: []
        }
      });
    } catch (error) {
      console.error('❌ Erro no dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // Relatório de faturamento
  async getRevenueReport(req, res, next) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      console.log('📊 Revenue report called:', { startDate, endDate, groupBy });
      
      let start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      let end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const bookings = await prisma.booking.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED'
        },
        include: {
          consumptions: true
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log(`📊 Found ${bookings.length} completed bookings`);
      
      let groupedData = [];
      
      if (groupBy === 'day') {
        const daysMap = new Map();
        bookings.forEach(booking => {
          const day = booking.createdAt.toISOString().split('T')[0];
          if (!daysMap.has(day)) {
            daysMap.set(day, { date: day, revenue: 0, bookings: 0, consumptions: 0 });
          }
          const dayData = daysMap.get(day);
          dayData.revenue += booking.totalAmount || 0;
          dayData.bookings += 1;
          dayData.consumptions += booking.consumptions.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
        });
        groupedData = Array.from(daysMap.values());
      }
      
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const totalBookings = bookings.length;
      const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      const totalConsumptions = bookings.reduce((sum, b) => 
        sum + b.consumptions.reduce((s, c) => s + (c.totalPrice || 0), 0), 0);
      
      res.json({
        success: true,
        data: {
          period: { start, end },
          summary: {
            totalRevenue,
            totalBookings,
            averageTicket,
            totalConsumptions
          },
          groupedData
        }
      });
    } catch (error) {
      console.error('❌ Erro no relatório de faturamento:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // Relatório de produtos
  async getProductsReport(req, res, next) {
    try {
      const { startDate, endDate, limit = 20 } = req.query;
      
      console.log('📊 Products report called:', { startDate, endDate });
      
      let start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      let end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const consumptions = await prisma.consumption.groupBy({
        by: ['productId'],
        where: {
          createdAt: { gte: start, lte: end }
        },
        _sum: {
          quantity: true,
          totalPrice: true
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: parseInt(limit)
      });
      
      const productsWithDetails = [];
      for (const item of consumptions) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        if (product) {
          productsWithDetails.push({
            product,
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: item._sum.totalPrice || 0
          });
        }
      }
      
      const totalRevenue = productsWithDetails.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
      const totalItems = productsWithDetails.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
      
      res.json({
        success: true,
        data: {
          period: { start, end },
          summary: {
            totalRevenue,
            totalItems,
            uniqueProducts: productsWithDetails.length
          },
          products: productsWithDetails
        }
      });
    } catch (error) {
      console.error('❌ Erro no relatório de produtos:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // Relatório de ocupação
  async getOccupancyReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      console.log('📊 Occupancy report called:', { startDate, endDate });
      
      let start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      let end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const totalRooms = await prisma.room.count();
      
      const bookings = await prisma.booking.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED'
        },
        include: {
          room: {
            include: { type: true }
          }
        }
      });
      
      const byRoomType = {};
      bookings.forEach(booking => {
        if (booking.room && booking.room.type) {
          const typeName = booking.room.type.name;
          if (!byRoomType[typeName]) {
            byRoomType[typeName] = {
              type: typeName,
              bookings: 0,
              totalHours: 0,
              totalRevenue: 0
            };
          }
          byRoomType[typeName].bookings++;
          byRoomType[typeName].totalRevenue += booking.totalAmount || 0;
          
          if (booking.startTime && booking.endTime) {
            const hours = (booking.endTime - booking.startTime) / (1000 * 60 * 60);
            byRoomType[typeName].totalHours += hours;
          }
        }
      });
      
      const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const dailyBookings = bookings.length / daysDiff;
      const occupancyRate = totalRooms > 0 ? (dailyBookings / totalRooms) * 100 : 0;
      
      res.json({
        success: true,
        data: {
          period: { start, end },
          summary: {
            totalRooms,
            totalBookings: bookings.length,
            averageDailyBookings: dailyBookings.toFixed(1),
            occupancyRate: occupancyRate.toFixed(1),
            averageTicket: bookings.length > 0 ? 
              bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / bookings.length : 0
          },
          byRoomType: Object.values(byRoomType)
        }
      });
    } catch (error) {
      console.error('❌ Erro no relatório de ocupação:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // Exportar relatório
  async exportReport(req, res, next) {
    try {
      const { type, startDate, endDate } = req.body;
      
      console.log('📊 Export report called:', { type, startDate, endDate });
      
      // Criar arquivo Excel simples
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Relatório');
      
      worksheet.getCell('A1').value = 'RELATÓRIO SISMOTEL';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.mergeCells('A1:F1');
      
      worksheet.getCell('A2').value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
      worksheet.mergeCells('A2:F2');
      
      worksheet.getCell('A3').value = `Período: ${startDate || 'Início'} a ${endDate || 'Hoje'}`;
      worksheet.mergeCells('A3:F3');
      
      worksheet.addRow([]);
      worksheet.addRow(['Relatório Gerado com Sucesso!']);
      
      const filename = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      await workbook.xlsx.write(res);
      res.end();
      
      console.log('✅ Relatório exportado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReportController();