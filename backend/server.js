const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uploadRoute  = require('./routes/upload');
const compareRoute = require('./routes/compare');
const historyRoute = require('./routes/history');
const gccRoute     = require('./routes/gcc');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/upload',    uploadRoute);
app.use('/api/compare',   compareRoute);
app.use('/api/history',   historyRoute);
app.use('/api/gcc-check', gccRoute);

// Pages
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/results', (req, res) => res.sendFile(path.join(__dirname, '../frontend/results.html')));
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '../frontend/history.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🛡️  BuildGuard is running!');
  console.log(`🌐  Open: http://localhost:${PORT}`);
  console.log('');
});