const express = require('express');
const { findGCC } = require('../utils/compiler');
const router = express.Router();

router.get('/', async (req, res) => {
  const gccPath = await findGCC();
  if (gccPath) {
    res.json({ found: true, path: gccPath });
  } else {
    res.json({
      found: false,
      message: 'GCC not found. Please install MinGW-w64 on Windows.'
    });
  }
});

module.exports = router;