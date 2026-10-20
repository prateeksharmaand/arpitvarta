require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*')
  .split(',').map(o => o.trim());

// Socket.io setup
const io = new Server(server, {
  cors: { origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  upgradeTimeout: 30000,
  allowEIO3: true,
  maxHttpBufferSize: 1e6,
});

// Security middleware
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

// Attach io to req for use in controllers
app.use((req, _, next) => { req.io = io; next(); });

// REST Routes
const { optionalAuth } = require('./src/middleware/auth');
app.use('/api/auth', require('./src/routes/auth'));
app.get('/api/dashboard', optionalAuth, require('./src/controllers/categoryController').getHome);
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/upload', require('./src/routes/upload'));
app.use('/api/professionals', require('./src/routes/professionals'));
app.use('/api/threads', require('./src/routes/threads'));
app.use('/api/wallet', require('./src/routes/wallet'));
app.use('/api/live', require('./src/routes/live'));
app.use('/api/agora', require('./src/routes/agora'));
app.use('/api/withdrawal', require('./src/routes/withdrawal'));
app.use('/api/consultations', require('./src/routes/consultations'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/hirings', require('./src/routes/hirings'));

// Health
app.get('/health', (_, res) => res.json({ success: true, message: 'ArpitVarta API', ts: new Date() }));

// Socket.io
const { initSocket } = require('./src/socket/index');
initSocket(io);

// Cron: process due withdrawals every hour
cron.schedule('0 * * * *', async () => {
  const { processDueWithdrawals } = require('./src/controllers/withdrawalController');
  await processDueWithdrawals();
});

// Cron: clear stale queued consultations every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const db = require('./src/config/database');

    // Cancel consultations that have been queued for more than 10 minutes
    const stale = await db.query(
      `UPDATE consultations
       SET status = 'cancelled', ended_at = NOW()
       WHERE status = 'queued'
         AND created_at < NOW() - INTERVAL '10 minutes'
       RETURNING id, professional_id`
    );

    if (stale.rows.length === 0) return;

    for (const row of stale.rows) {
      // Clear from queue table
      await db.query(
        `UPDATE consultation_queue SET status = 'cancelled'
         WHERE consultation_id = $1 AND status = 'waiting'`,
        [row.id]
      );

      // Decrement professional queue count
      await db.query(
        `UPDATE professionals SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1`,
        [row.professional_id]
      );

      // Notify user via socket if still connected
      io.to(`consultation:${row.id}`).emit('consultation_ended', {
        consultation_id: row.id,
        reason: 'queue_timeout',
      });
    }

    console.log(`[Queue cleaner] Cleared ${stale.rows.length} stale consultation(s)`);
  } catch (err) {
    console.error('[Queue cleaner] Error:', err.message);
  }
});

// 404 & error handler
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, _, res, __) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

server.listen(PORT, () => console.log(`ArpitVarta API running on port ${PORT}`));
module.exports = { app, io };
