const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../config/logger');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        throw new AppError('Usuário e senha são obrigatórios', 400);
      }
      
      const user = await prisma.user.findUnique({
        where: { username }
      });
      
      if (!user) {
        throw new AppError('Usuário ou senha inválidos', 401);
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        throw new AppError('Usuário ou senha inválidos', 401);
      }
      
      if (!user.active) {
        throw new AppError('Usuário inativo. Contate o administrador.', 403);
      }
      
      // Gerar tokens
      const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
      );
      
      // Log de login
      logger.info(`Usuário ${user.username} fez login`);
      
      // Registrar log no banco
      await prisma.log.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ ip: req.ip }),
          ipAddress: req.ip
        }
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError('Refresh token não fornecido', 400);
      }
      
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user || !user.active) {
        throw new AppError('Usuário não encontrado ou inativo', 401);
      }
      
      const newAccessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      res.json({
        success: true,
        data: { accessToken: newAccessToken }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async logout(req, res, next) {
    try {
      // Logout é gerenciado no frontend (remover token)
      // Aqui apenas registramos o logout
      if (req.user) {
        await prisma.log.create({
          data: {
            userId: req.user.id,
            action: 'LOGOUT',
            entity: 'user',
            entityId: req.user.id,
            ipAddress: req.ip
          }
        });
        
        logger.info(`Usuário ${req.user.username} fez logout`);
      }
      
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getMe(req, res, next) {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();