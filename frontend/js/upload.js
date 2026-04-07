// ===== BUILDGUARD - UPLOAD PAGE LOGIC =====

let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  initUploadZone();
  loadStats();
  loadRecentChecks();
});

// ---- Upload Zone ----
function initUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  const selectedFileEl = document.getElementById('selectedFile');
  const removeBtn = document.getElementById('removeFile');
  const checkBtn = document.getElementById('checkBtn');
  const browseBtn = document.getElementById('browseBtn');

  if (!zone) return;

  browseBtn.addEventListener('click', () => input.click());
  zone.addEventListener('click', (e) => {
    if (!e.target.closest('#selectedFile') && !e.target.closest('#browseBtn')) {
      input.click();
    }
  });

  input.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });

  checkBtn?.addEventListener('click', submitFile);
}

function handleFile(file) {
  if (!file.name.endsWith('.c')) {
    showToast('Only .c files are allowed!', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('File is too large! Maximum 5MB.', 'error');
    return;
  }

  selectedFile = file;

  const nameEl = document.querySelector('.file-name');
  const sizeEl = document.querySelector('.file-size');
  const selectedFileEl = document.getElementById('selectedFile');
  const checkBtn = document.getElementById('checkBtn');

  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = formatSize(file.size);
  if (selectedFileEl) selectedFileEl.classList.add('show');
  if (checkBtn) checkBtn.disabled = false;

  showToast(`File "${file.name}" selected!`, 'success');
}

function clearFile() {
  selectedFile = null;
  const input = document.getElementById('fileInput');
  const selectedFileEl = document.getElementById('selectedFile');
  const checkBtn = document.getElementById('checkBtn');

  if (input) input.value = '';
  if (selectedFileEl) selectedFileEl.classList.remove('show');
  if (checkBtn) checkBtn.disabled = true;
}

async function submitFile() {
  if (!selectedFile) {
    showToast('Please select a .c file first!', 'warning');
    return;
  }

  const checkBtn = document.getElementById('checkBtn');
  const progressWrap = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  checkBtn.disabled = true;
  checkBtn.innerHTML = '<span class="spinner"></span> Checking...';

  if (progressWrap) progressWrap.classList.add('show');

  // Simulate progress stages
  const stages = [
    { pct: 25, text: '📤 Uploading file...' },
    { pct: 50, text: '⚙️ Compiling build 1...' },
    { pct: 75, text: '⚙️ Compiling build 2...' },
    { pct: 90, text: '🔍 Comparing outputs...' },
  ];

  let stageIndex = 0;
  const stageInterval = setInterval(() => {
    if (stageIndex < stages.length) {
      const s = stages[stageIndex++];
      if (progressFill) progressFill.style.width = s.pct + '%';
      if (progressText) progressText.innerHTML = `<span>${s.text}</span>`;
    }
  }, 800);

  const formData = new FormData();
  formData.append('cfile', selectedFile);

  try {
    const response = await fetch((window.BG_API_BASE || '') + '/api/upload', {
      method: 'POST',
      body: formData
    });

    clearInterval(stageInterval);

    if (progressFill) progressFill.style.width = '100%';
    if (progressText) progressText.innerHTML = '<span>✅ Done!</span>';

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    setTimeout(() => {
      window.location.href = (window.BG_ORIGIN || window.location.origin) + '/results?id=' + data.id;
    }, 600);

  } catch (err) {
    clearInterval(stageInterval);
    if (progressWrap) progressWrap.classList.remove('show');
    checkBtn.disabled = false;
    checkBtn.innerHTML = '🛡️ Check Reproducibility';
    showToast(err.message || 'Something went wrong!', 'error');
  }
}

// ---- Stats ----
async function loadStats() {
  try {
    const res = await fetch((window.BG_API_BASE || '') + '/api/history/stats');
    const data = await res.json();

    const totalEl   = document.getElementById('statTotal');
    const reproEl   = document.getElementById('statRepro');
    const failEl    = document.getElementById('statFail');
    const avgEl     = document.getElementById('statAvg');

    if (totalEl) totalEl.textContent = data.total;
    if (reproEl) reproEl.textContent = data.reproducible;
    if (failEl)  failEl.textContent  = data.nonReproducible;
    if (avgEl)   avgEl.textContent   = data.avgScore + '%';
  } catch (e) {
    // Stats not critical
  }
}

// ---- Recent Checks ----
async function loadRecentChecks() {
  const list = document.getElementById('recentList');
  if (!list) return;

  try {
    const res = await fetch((window.BG_API_BASE || '') + '/api/history');
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No checks yet</h3>
          <p>Upload a .c file above to get started!</p>
        </div>`;
      return;
    }

    const recent = data.slice(0, 5);
    list.innerHTML = recent.map(item => `
      <a href="${window.BG_ORIGIN || window.location.origin}/results?id=${item.id}" class="recent-item">
        <span class="item-icon">${item.is_reproducible ? '✅' : '❌'}</span>
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.filename)}</div>
          <div class="item-date">${formatDate(item.check_date)}</div>
        </div>
        <span class="item-score ${item.score >= 80 ? 'high' : 'low'}">${item.score}%</span>
      </a>
    `).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>Could not load recent checks.</p></div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}