const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const uploadRoute  = require('./routes/upload');
const compareRoute = require('./routes/compare');
const historyRoute = require('./routes/history');
const gccRoute     = require('./routes/gcc');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ FIXED: frontend path
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/upload', uploadRoute);
app.use('/api/compare', compareRoute);
app.use('/api/history', historyRoute);
app.use('/api/gcc-check', gccRoute);

// Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/results', (req, res) => {
  res.sendFile(path.join(frontendPath, 'results.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(frontendPath, 'history.html'));
});

// Health check (VERY IMPORTANT for deployment)
app.get('/health', (req, res) => {
  res.send('OK');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});