const { logger } = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  
  // Log do erro
  if (statusCode === 500) {
    logger.error(`Erro interno: ${err.stack}`);
  } else {
    logger.warn(`Erro operacional: ${message}`);
  }
  
  // Resposta para o cliente
  res.status(statusCode).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Erro interno do servidor'
        : message,
      code: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  AppError,
  errorHandler
};