const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class RoomController {
  async getAllRooms(req, res, next) {
    try {
      const { status, typeId, floor } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (typeId) where.typeId = typeId;
      if (floor) where.floor = parseInt(floor);
      
      const rooms = await prisma.room.findMany({
        where,
        include: {
          type: true,
          bookings: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { startTime: 'desc' }
          }
        },
        orderBy: { number: 'asc' }
      });
      
      const stats = {
        total: rooms.length,
        available: rooms.filter(r => r.status === 'AVAILABLE').length,
        occupied: rooms.filter(r => r.status === 'OCCUPIED').length,
        cleaning: rooms.filter(r => r.status === 'CLEANING').length
      };
      
      res.json({
        success: true,
        data: rooms,
        meta: stats
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getRoomById(req, res, next) {
    try {
      const { id } = req.params;
      
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          type: true,
          bookings: {
            where: { status: 'ACTIVE' },
            include: {
              consumptions: {
                include: { product: true }
              },
              timeExtras: true
            }
          }
        }
      });
      
      if (!room) {
        throw new AppError('Quarto não encontrado', 404);
      }
      
      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      next(error);
    }
  }
  
  async createRoom(req, res, next) {
    try {
      const { number, typeId, floor, hasWindow, description } = req.body;
      
      // Verificar se número já existe
      const existingRoom = await prisma.room.findUnique({
        where: { number }
      });
      
      if (existingRoom) {
        throw new AppError('Já existe um quarto com este número', 400);
      }
      
      const room = await prisma.room.create({
        data: {
          number,
          typeId,
          floor,
          hasWindow,
          description,
          status: 'AVAILABLE'
        },
        include: { type: true }
      });
      
      res.status(201).json({
        success: true,
        data: room,
        message: 'Quarto criado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const { typeId, floor, hasWindow, description, status } = req.body;
      
      const room = await prisma.room.update({
        where: { id },
        data: {
          typeId,
          floor,
          hasWindow,
          description,
          status
        },
        include: { type: true }
      });
      
      res.json({
        success: true,
        data: room,
        message: 'Quarto atualizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateRoomStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Status inválido', 400);
      }
      
      const room = await prisma.room.update({
        where: { id },
        data: { status },
        include: { type: true }
      });
      
      // Emitir evento via WebSocket (será implementado no controller principal)
      req.app.get('io').emit('room-status-update', {
        roomId: id,
        status,
        roomNumber: room.number
      });
      
      res.json({
        success: true,
        data: room,
        message: 'Status do quarto atualizado'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      
      // Verificar se tem reservas ativas
      const activeBookings = await prisma.booking.count({
        where: {
          roomId: id,
          status: 'ACTIVE'
        }
      });
      
      if (activeBookings > 0) {
        throw new AppError('Não é possível excluir quarto com reservas ativas', 400);
      }
      
      await prisma.room.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: 'Quarto excluído com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoomController();