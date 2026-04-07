const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { checkBuild } = require('../controllers/buildController');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

const UPLOAD_PATH = path.resolve(
  path.join(__dirname, '../../'),
  process.env.UPLOAD_PATH || './uploads'
);

if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_PATH),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() === '.c') {
    cb(null, true);
  } else {
    cb(new Error('Only .c files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', upload.single('cfile'), checkBuild);

router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

module.exports = router;