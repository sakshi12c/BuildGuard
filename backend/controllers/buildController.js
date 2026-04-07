const path = require('path');
const fs = require('fs');
const { compileTwice } = require('../utils/compiler');
const { analyzeHashes } = require('../utils/differ');
const db = require('../../database/db');

async function checkBuild(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload a .c file.' });
  }

  const sourcePath = req.file.path;
  const baseName = path.basename(req.file.filename, path.extname(req.file.filename)) + '_' + Date.now();

  try {
    const result = await compileTwice(sourcePath, baseName);
    const analysis = analyzeHashes(result.hash1, result.hash2, result.isReproducible, result.score);

    const info = await db.runAsync(
      `INSERT INTO build_checks (filename, check_date, is_reproducible, score, hash1, hash2, file_size, build_time_ms, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.file.originalname,
        new Date().toISOString(),
        result.isReproducible ? 1 : 0,
        result.score,
        result.hash1,
        result.hash2,
        result.fileSize,
        result.buildTime,
        JSON.stringify(analysis)
      ]
    );

    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);

    return res.json({
      id: info.lastID,
      filename: req.file.originalname,
      isReproducible: result.isReproducible,
      score: result.score,
      hash1: result.hash1,
      hash2: result.hash2,
      fileSize: result.fileSize,
      buildTime: result.buildTime,
      analysis
    });

  } catch (err) {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);

    // GCC not found — give clear message
    if (err.error === 'GCC_NOT_FOUND') {
      return res.status(500).json({
        error: 'GCC compiler not found on your system.',
        details: err.stderr,
        fix: 'Install MinGW-w64 from https://www.mingw-w64.org/downloads/ and add it to your PATH'
      });
    }

    return res.status(500).json({
      error: 'Compilation failed. Check that your C file has no syntax errors.',
      details: err.stderr || err.error || String(err)
    });
  }
}

module.exports = { checkBuild };