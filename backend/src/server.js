const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const db = require('./config/supabase');
const errorHandler = require('./middleware/errorHandler');

const claimRoutes = require('./routes/claim.routes');
const payerRoutes = require('./routes/payer.routes');
const documentRoutes = require('./routes/document.routes');
const auditRoutes = require('./routes/audit.routes');
const cdtRoutes = require('./routes/cdt.routes');
const assessmentRoutes = require('./routes/assessment.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'CLAIM-SHIELD',
    tagline: 'Shield every claim before it gets submitted.',
    database: db.isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local Fallback Engine',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/payers', payerRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/cdt', cdtRoutes);
app.use('/api/assessment', assessmentRoutes);

// Nested routes for documents and audits
app.use('/api/documents', documentRoutes);
app.use('/api/claims/:id/documents', documentRoutes);
app.use('/api/claims/:id/audit', auditRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`              CLAIM-SHIELD BACKEND RUNNING                  `);
  console.log(`============================================================`);
  console.log(` Server URL: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Database: ${db.isSupabaseConfigured() ? 'Supabase Connected' : 'Resilient Local Storage'}`);
  console.log(`============================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n============================================================`);
    console.error(` ERROR: Port ${PORT} is already in use by another process.`);
    console.error(` Another server instance is currently listening on port ${PORT}.`);
    console.error(`============================================================\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

