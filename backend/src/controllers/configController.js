const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class ConfigController {
  async getSystemConfig(req, res, next) {
    try {
      const configs = await prisma.systemConfig.findMany();
      
      const configObject = {};
      configs.forEach(config => {
        configObject[config.key] = config.value;
      });
      
      res.json({
        success: true,
        data: configObject
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateSystemConfig(req, res, next) {
    try {
      const updates = req.body;
      
      const promises = Object.entries(updates).map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) }
        })
      );
      
      await Promise.all(promises);
      
      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getRoomTypes(req, res, next) {
    try {
      const roomTypes = await prisma.roomType.findMany({
        where: { active: true },
        include: {
          rooms: {
            select: { id: true, number: true, status: true }
          }
        }
      });
      
      res.json({
        success: true,
        data: roomTypes
      });
    } catch (error) {
      next(error);
    }
  }
  
  async createRoomType(req, res, next) {
    try {
      const roomType = await prisma.roomType.create({
        data: req.body
      });
      
      res.status(201).json({
        success: true,
        data: roomType,
        message: 'Tipo de quarto criado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateRoomType(req, res, next) {
    try {
      const { id } = req.params;
      
      const roomType = await prisma.roomType.update({
        where: { id },
        data: req.body
      });
      
      res.json({
        success: true,
        data: roomType,
        message: 'Tipo de quarto atualizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getPricingConfig(req, res, next) {
    try {
      const roomTypes = await prisma.roomType.findMany({
        select: {
          id: true,
          name: true,
          hourlyRate: true,
          overnightRate: true,
          initialHours: true,
          overtimeRate: true
        }
      });
      
      res.json({
        success: true,
        data: roomTypes
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updatePricingConfig(req, res, next) {
    try {
      const { roomTypeId, rates } = req.body;
      
      const roomType = await prisma.roomType.update({
        where: { id: roomTypeId },
        data: rates
      });
      
      res.json({
        success: true,
        data: roomType,
        message: 'Preços atualizados com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConfigController();