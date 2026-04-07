const express = require('express');
const db = require('../../database/db');
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const total      = await db.getAsync('SELECT COUNT(*) as count FROM build_checks');
    const reproducible = await db.getAsync('SELECT COUNT(*) as count FROM build_checks WHERE is_reproducible = 1');
    const avgScore   = await db.getAsync('SELECT AVG(score) as avg FROM build_checks');

    res.json({
      total: total.count,
      reproducible: reproducible.count,
      nonReproducible: total.count - reproducible.count,
      avgScore: Math.round(avgScore.avg || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: String(err) });
  }
});

router.get('/', async (req, res) => {
  try {
    const results = await db.allAsync(
      'SELECT * FROM build_checks ORDER BY check_date DESC LIMIT 50'
    );

    results.forEach(r => {
      try { r.details = JSON.parse(r.details || '{}'); }
      catch (e) { r.details = {}; }
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: String(err) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const info = await db.runAsync('DELETE FROM build_checks WHERE id = ?', [req.params.id]);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: String(err) });
  }
});

module.exports = router;