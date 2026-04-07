const express = require('express');
const { getResult } = require('../controllers/compareController');
const router = express.Router();

router.get('/:id', getResult);

module.exports = router;