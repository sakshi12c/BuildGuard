const db = require('../../database/db');

async function getResult(req, res) {
  const { id } = req.params;

  try {
    const result = await db.getAsync('SELECT * FROM build_checks WHERE id = ?', [id]);

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    try {
      result.details = JSON.parse(result.details || '{}');
    } catch (e) {
      result.details = {};
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Database error', details: String(err) });
  }
}

module.exports = { getResult };