require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ── WebSocket ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket connected: ${socket.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  socket.on('send_message', (data) => {
    io.to(`conv_${data.conversationId}`).emit('new_message', data);
  });

  socket.on('booking_update', (data) => {
    io.to(`venue_${data.venueId}`).emit('booking_update', data);
  });

  socket.on('join_venue_room', (venueId) => {
    socket.join(`venue_${venueId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// AI endpoints get stricter limit (cost control)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'AI rate limit exceeded. Try again in a minute.' },
});
app.use('/api/ai/', aiLimiter);

// Static uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const venuesRoutes = require('./routes/venues');
const aiRoutes = require('./routes/ai');
const mapsRoutes = require('./routes/maps');
const { upload, uploadRoute } = require('./middleware/upload');

const {
  eventsRouter,
  bookingsRouter,
  reviewsRouter,
  messagesRouter,
  managersRouter,
} = require('./routes/crud');

app.use('/api/auth', authRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/events', eventsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/managers', managersRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/maps', mapsRoutes);

// Media upload
app.post('/api/upload', upload.array('files', 10), uploadRoute);
app.post('/api/upload/single', upload.single('file'), uploadRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Vibes in the City API',
    version: '1.0.0',
    endpoints: {
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/refresh',
        'POST /api/auth/logout',
        'GET  /api/auth/me',
        'PUT  /api/auth/me',
        'PUT  /api/auth/password',
      ],
      venues: [
        'GET  /api/venues',
        'GET  /api/venues/my',
        'GET  /api/venues/favorites/list',
        'GET  /api/venues/:id',
        'POST /api/venues',
        'PUT  /api/venues/:id',
        'DELETE /api/venues/:id',
        'POST /api/venues/:id/publish',
        'POST /api/venues/:id/favorite',
      ],
      events: [
        'GET  /api/events',
        'GET  /api/events/:id',
        'POST /api/events',
        'PUT  /api/events/:id',
        'DELETE /api/events/:id',
      ],
      bookings: [
        'GET  /api/bookings/my',
        'GET  /api/bookings/venue/:venueId',
        'POST /api/bookings',
        'PUT  /api/bookings/:id/status',
        'DELETE /api/bookings/:id',
      ],
      reviews: [
        'GET  /api/reviews/venue/:venueId',
        'POST /api/reviews',
        'POST /api/reviews/:id/reply',
      ],
      messages: [
        'GET  /api/messages/conversations',
        'GET  /api/messages/conversations/:id',
        'POST /api/messages',
      ],
      managers: [
        'GET  /api/managers',
        'POST /api/managers',
        'PUT  /api/managers/:id',
        'DELETE /api/managers/:id',
      ],
      ai: [
        'POST /api/ai/improve-description',
        'POST /api/ai/generate-promo',
        'POST /api/ai/chat',
        'GET  /api/ai/content/:eventId',
      ],
      media: [
        'POST /api/upload (multiple)',
        'POST /api/upload/single',
      ],
    },
  });
});

// Error handlers
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Vibes API running on port ${PORT}`);
  console.log(`📋 Docs: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server };
