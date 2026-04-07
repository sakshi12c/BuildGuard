const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BUILD_PATH = path.resolve(
  path.join(__dirname, '../../'),
  process.env.BUILD_PATH || './builds'
);

if (!fs.existsSync(BUILD_PATH)) {
  fs.mkdirSync(BUILD_PATH, { recursive: true });
}

const WINDOWS_GCC_PATHS = [
  'C:\\mingw64\\bin\\gcc.exe',
  'C:\\MinGW\\bin\\gcc.exe',
  'C:\\msys64\\mingw64\\bin\\gcc.exe',
];

function findGCC() {
  return new Promise((resolve) => {
    exec('gcc --version', (err) => {
      if (!err) { resolve('gcc'); return; }
      exec('where gcc', (err2, stdout2) => {
        if (!err2 && stdout2.trim()) {
          resolve(stdout2.trim().split('\n')[0].trim()); return;
        }
        for (const p of WINDOWS_GCC_PATHS) {
          if (fs.existsSync(p)) { resolve(p); return; }
        }
        resolve(null);
      });
    });
  });
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function calculateScore(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const maxLen = Math.max(lines1.length, lines2.length);
  
  let diffLines = 0;
  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';
    if (line1 !== line2) diffLines++;
  }
  
  if (diffLines === 0) return 100;
  if (diffLines === 1) return 92;
  if (diffLines === 2) return 88;
  if (diffLines === 3) return 82;
  if (diffLines === 4) return 75;
  if (diffLines >= 6) return 68;
  if (diffLines >= 10) return 58;
  if (diffLines >= 20) return 45;
  if (diffLines >= 30) return 30;
  if (diffLines >= 50) return 15;
  
  return 10;
}

// Check if source uses __DATE__ or __TIME__
function hasTimestampMacros(source) {
  return source.includes('__DATE__') ||
         source.includes('__TIME__') ||
         source.includes('__TIMESTAMP__');
}

// Replace __DATE__ and __TIME__ with fixed or variable fake strings
// This way we CONTROL what goes into each build
function injectTimestamp(source, build) {
  let modified = source;
  if (build === 1) {
    // Build 1 gets OLD fixed date
    modified = modified.replace(/__DATE__/g, '"Jan 01 2000"');
    modified = modified.replace(/__TIME__/g, '"00:00:00"');
    modified = modified.replace(/__TIMESTAMP__/g, '"Jan 01 2000 00:00:00"');
  } else {
    // Build 2 gets NEW different date
    modified = modified.replace(/__DATE__/g, '"Dec 31 2099"');
    modified = modified.replace(/__TIME__/g, '"23:59:59"');
    modified = modified.replace(/__TIMESTAMP__/g, '"Dec 31 2099 23:59:59"');
  }
  return modified;
}

function runCompile(gccPath, sourcePath, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `"${gccPath}" -S -O0 "${sourcePath}" -o "${outputPath}"`;
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) reject({ error: error.message, stderr: stderr || '' });
      else resolve({ stdout, stderr });
    });
  });
}

async function compileTwice(sourcePath, baseName) {
  const gccPath = await findGCC();
  if (!gccPath) {
    throw {
      error: 'GCC_NOT_FOUND',
      stderr: 'GCC not found. Please install MinGW-w64 and add to PATH.'
    };
  }

  const startTime = Date.now();

  // Read original source
  const originalSource = fs.readFileSync(sourcePath, 'utf8');
  const needsInjection = hasTimestampMacros(originalSource);

  // Create two modified source files
  const src1Path = path.join(BUILD_PATH, `${baseName}_src1.c`);
  const src2Path = path.join(BUILD_PATH, `${baseName}_src2.c`);
  const out1Path = path.join(BUILD_PATH, `${baseName}_out1.s`);
  const out2Path = path.join(BUILD_PATH, `${baseName}_out2.s`);

  try {
    if (needsInjection) {
      // Inject different timestamps into each build's source
      fs.writeFileSync(src1Path, injectTimestamp(originalSource, 1));
      fs.writeFileSync(src2Path, injectTimestamp(originalSource, 2));
    } else {
      // No timestamps — both builds use same source
      fs.writeFileSync(src1Path, originalSource);
      fs.writeFileSync(src2Path, originalSource);
    }

    // Compile both to assembly text
    await runCompile(gccPath, src1Path, out1Path);
    await runCompile(gccPath, src2Path, out2Path);

    const buildTime = Date.now() - startTime;

    // Read assembly output as plain text
    const text1 = fs.readFileSync(out1Path, 'utf8');
    const text2 = fs.readFileSync(out2Path, 'utf8');

    const hash1          = hashText(text1);
    const hash2          = hashText(text2);
    const isReproducible = hash1 === hash2;
    const score          = isReproducible ? 100 : calculateScore(text1, text2);
    const fileSize       = Buffer.byteLength(text1);

    // Cleanup all temp files
    [src1Path, src2Path, out1Path, out2Path].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);

    return { isReproducible, hash1, hash2, score, buildTime, fileSize };

  } catch (err) {
    [src1Path, src2Path, out1Path, out2Path].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    throw err;
  }
}

module.exports = { compileTwice, findGCC };