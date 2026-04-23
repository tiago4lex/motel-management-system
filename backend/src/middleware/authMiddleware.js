const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido ou formato inválido' });
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }
      
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          fullName: true,
          active: true
        }
      });
      
      if (!user || !user.active) {
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      logger.error('Erro na autenticação:', error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
  
  authorize(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Acesso negado. Permissão insuficiente.' 
        });
      }
      next();
    };
  }
}

module.exports = new AuthMiddleware();