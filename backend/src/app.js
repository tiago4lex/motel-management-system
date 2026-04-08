const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Importar configurações
const { logger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/v1/auth');
const roomRoutes = require('./routes/v1/rooms');
const bookingRoutes = require('./routes/v1/bookings');
const productRoutes = require('./routes/v1/products');
const reportRoutes = require('./routes/v1/reports');
const configRoutes = require('./routes/v1/config');
const adminRoutes = require('./routes/v1/admin');

class App {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    });

    // Armazenar io no app para acesso nos controllers
    this.app.set('io', this.io);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketEvents();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // CORS - Configuração correta
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Segurança (mas com CORS configurado)
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Logging
    this.app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

    // Compressão
    this.app.use(compression());

    // Parse JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1;
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000;

    const limiter = rateLimit({
      windowMs: windowMs * 60 * 1000,
      max: maxRequests,
      message: 'Muitas requisições deste IP, tente novamente mais tarde.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => process.env.NODE_ENV === 'development'
    });

    if (process.env.NODE_ENV === 'production') {
      this.app.use('/api', limiter);
    } else {
      // Em desenvolvimento, usar limite muito alto
      const devLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: 10000, // 10000 requisições por minuto
        message: 'Muitas requisições',
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use('/api', devLimiter);
    }

    // Arquivos estáticos
    const uploadsDir = path.join(__dirname, '../uploads');
    this.app.use('/uploads', express.static(uploadsDir));
  }

  initializeRoutes() {
    const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

    // Rotas públicas
    this.app.use(`${apiPrefix}/auth`, authRoutes);

    // Rotas protegidas
    this.app.use(`${apiPrefix}/rooms`, roomRoutes);
    this.app.use(`${apiPrefix}/bookings`, bookingRoutes);
    this.app.use(`${apiPrefix}/products`, productRoutes);
    this.app.use(`${apiPrefix}/reports`, reportRoutes);
    this.app.use(`${apiPrefix}/config`, configRoutes);
    this.app.use(`${apiPrefix}/admin`, adminRoutes);

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date() });
    });

    // Rota 404
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Rota não encontrada',
          code: 404
        }
      });
    });
  }

  initializeSocketEvents() {
    this.io.on('connection', (socket) => {
      logger.info(`Novo cliente conectado: ${socket.id}`);

      socket.on('join-room', (roomId) => {
        socket.join(`room-${roomId}`);
        logger.debug(`Socket ${socket.id} entrou na sala room-${roomId}`);
      });

      socket.on('leave-room', (roomId) => {
        socket.leave(`room-${roomId}`);
        logger.debug(`Socket ${socket.id} saiu da sala room-${roomId}`);
      });

      socket.on('room-status-update', (data) => {
        this.io.to(`room-${data.roomId}`).emit('status-changed', data);
        this.io.emit('dashboard-update', data);
      });

      socket.on('new-booking', (data) => {
        this.io.emit('booking-created', data);
        this.io.to(`room-${data.roomId}`).emit('room-occupied', data);
      });

      socket.on('checkout', (data) => {
        this.io.emit('checkout-completed', data);
        this.io.to(`room-${data.roomId}`).emit('room-available', data);
      });

      socket.on('disconnect', () => {
        logger.info(`Cliente desconectado: ${socket.id}`);
      });
    });
  }

  initializeErrorHandling() {
    this.app.use(errorHandler);
  }

  async start(port) {
    try {
      await initializeDatabase();
      this.server.listen(port, () => {
        logger.info(`🚀 Servidor rodando na porta ${port}`);
        logger.info(`📝 Ambiente: ${process.env.NODE_ENV}`);
        logger.info(`🔗 API: http://localhost:${port}/api/${process.env.API_VERSION || 'v1'}`);
        logger.info(`🔗 Frontend permitido: http://localhost:5173`);
      });
    } catch (error) {
      logger.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }
}

module.exports = App;