const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');

class AdminController {
  // ==================== GERENCIAMENTO DE QUARTOS ====================
  
  // Listar todos os quartos com detalhes
  async getAllRooms(req, res, next) {
    try {
      const rooms = await prisma.room.findMany({
        include: {
          type: true,
          bookings: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        },
        orderBy: { number: 'asc' }
      });
      
      res.json({ success: true, data: rooms });
    } catch (error) {
      next(error);
    }
  }
  
  // Criar novo quarto
  async createRoom(req, res, next) {
    try {
      const { number, typeId, floor, description } = req.body;
      
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
          floor: floor || null,
          description,
          status: 'AVAILABLE'
        },
        include: { type: true }
      });
      
      res.status(201).json({
        success: true,
        data: room,
        message: `Quarto ${number} criado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Atualizar quarto
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const { number, typeId, floor, description, status } = req.body;
      
      const room = await prisma.room.update({
        where: { id },
        data: {
          number,
          typeId,
          floor,
          description,
          status
        },
        include: { type: true }
      });
      
      res.json({
        success: true,
        data: room,
        message: `Quarto ${room.number} atualizado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Deletar quarto
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      
      const activeBookings = await prisma.booking.count({
        where: {
          roomId: id,
          status: 'ACTIVE'
        }
      });
      
      if (activeBookings > 0) {
        throw new AppError('Não é possível excluir quarto com reservas ativas', 400);
      }
      
      const room = await prisma.room.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: `Quarto ${room.number} excluído com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== GERENCIAMENTO DE TIPOS DE QUARTO ====================
  
  // Listar tipos de quarto
  async getAllRoomTypes(req, res, next) {
    try {
      const roomTypes = await prisma.roomType.findMany({
        include: {
          rooms: {
            select: { id: true, number: true, status: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      res.json({ success: true, data: roomTypes });
    } catch (error) {
      next(error);
    }
  }
  
  // Criar tipo de quarto
  async createRoomType(req, res, next) {
    try {
      const { name, description, initialPrice, hourlyRate, overnightRate, cleaningTime } = req.body;
      
      const existingType = await prisma.roomType.findUnique({
        where: { name }
      });
      
      if (existingType) {
        throw new AppError('Já existe um tipo de quarto com este nome', 400);
      }
      
      const roomType = await prisma.roomType.create({
        data: {
          name,
          description,
          initialPrice,
          hourlyRate,
          overnightRate,
          cleaningTime: cleaningTime || 30,
          active: true
        }
      });
      
      res.status(201).json({
        success: true,
        data: roomType,
        message: `Tipo ${name} criado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Atualizar tipo de quarto
  async updateRoomType(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, initialPrice, hourlyRate, overnightRate, cleaningTime, active } = req.body;
      
      const roomType = await prisma.roomType.update({
        where: { id },
        data: {
          name,
          description,
          initialPrice,
          hourlyRate,
          overnightRate,
          cleaningTime,
          active
        }
      });
      
      res.json({
        success: true,
        data: roomType,
        message: `Tipo ${roomType.name} atualizado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Deletar tipo de quarto
  async deleteRoomType(req, res, next) {
    try {
      const { id } = req.params;
      
      const roomsWithType = await prisma.room.count({
        where: { typeId: id }
      });
      
      if (roomsWithType > 0) {
        throw new AppError('Não é possível excluir tipo de quarto que possui quartos associados', 400);
      }
      
      const roomType = await prisma.roomType.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: `Tipo ${roomType.name} excluído com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== GERENCIAMENTO DE PRODUTOS ====================
  
  // Listar todos os produtos
  async getAllProducts(req, res, next) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { name: 'asc' }
      });
      
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }
  
  // Criar produto
  async createProduct(req, res, next) {
    try {
      const { code, name, description, price, cost, category, stockControlled, stockQuantity, minStockAlert } = req.body;
      
      const existingCode = await prisma.product.findUnique({
        where: { code }
      });
      
      if (existingCode) {
        throw new AppError('Já existe um produto com este código', 400);
      }
      
      const existingName = await prisma.product.findUnique({
        where: { name }
      });
      
      if (existingName) {
        throw new AppError('Já existe um produto com este nome', 400);
      }
      
      const product = await prisma.product.create({
        data: {
          code,
          name,
          description,
          price,
          cost: cost || null,
          category,
          stockControlled: stockControlled !== undefined ? stockControlled : true,
          stockQuantity: stockQuantity || 0,
          minStockAlert: minStockAlert || 5,
          active: true
        }
      });
      
      res.status(201).json({
        success: true,
        data: product,
        message: `Produto ${name} criado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Atualizar produto
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { code, name, description, price, cost, category, stockControlled, stockQuantity, minStockAlert, active } = req.body;
      
      const product = await prisma.product.update({
        where: { id },
        data: {
          code,
          name,
          description,
          price,
          cost,
          category,
          stockControlled,
          stockQuantity,
          minStockAlert,
          active
        }
      });
      
      res.json({
        success: true,
        data: product,
        message: `Produto ${product.name} atualizado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Deletar produto
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      
      const consumptions = await prisma.consumption.count({
        where: { productId: id }
      });
      
      if (consumptions > 0) {
        throw new AppError('Não é possível excluir produto que possui consumos registrados', 400);
      }
      
      const product = await prisma.product.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: `Produto ${product.name} excluído com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Ajustar estoque
  async adjustStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, type, reason } = req.body;
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new AppError('Produto não encontrado', 404);
      }
      
      let newQuantity = product.stockQuantity;
      if (type === 'IN') {
        newQuantity += quantity;
      } else if (type === 'OUT') {
        newQuantity -= quantity;
      } else {
        newQuantity = quantity;
      }
      
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { stockQuantity: newQuantity }
      });
      
      await prisma.stockMovement.create({
        data: {
          productId: id,
          type,
          quantity,
          reason: reason || 'Ajuste manual',
          userId: req.user.id
        }
      });
      
      res.json({
        success: true,
        data: updatedProduct,
        message: `Estoque de ${product.name} atualizado para ${newQuantity}`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== GERENCIAMENTO DE USUÁRIOS ====================
  
  // Listar todos os usuários
  async getAllUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }
  
  // Criar usuário
  async createUser(req, res, next) {
    try {
      const { username, email, password, fullName, role } = req.body;
      
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUsername) {
        throw new AppError('Já existe um usuário com este nome', 400);
      }
      
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingEmail) {
        throw new AppError('Já existe um usuário com este email', 400);
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          fullName,
          role: role || 'OPERATOR',
          active: true
        },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
          createdAt: true
        }
      });
      
      res.status(201).json({
        success: true,
        data: user,
        message: `Usuário ${fullName} criado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Atualizar usuário
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { username, email, fullName, role, active, password } = req.body;
      
      const updateData = {
        username,
        email,
        fullName,
        role,
        active
      };
      
      if (password && password.length > 0) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
          createdAt: true
        }
      });
      
      res.json({
        success: true,
        data: user,
        message: `Usuário ${user.fullName} atualizado com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Deletar usuário
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      if (id === req.user.id) {
        throw new AppError('Não é possível excluir seu próprio usuário', 400);
      }
      
      const bookings = await prisma.booking.count({
        where: { userId: id }
      });
      
      if (bookings > 0) {
        throw new AppError('Não é possível excluir usuário que possui atendimentos registrados', 400);
      }
      
      const user = await prisma.user.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: `Usuário ${user.fullName} excluído com sucesso`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();