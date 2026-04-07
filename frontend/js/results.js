// ===== BUILDGUARD - RESULTS & HISTORY PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('results')) loadResult();
  if (path.includes('history')) loadHistory();
});

// ======== RESULTS PAGE ========
async function loadResult() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('No result ID found in URL.');
    return;
  }

  try {
    const res = await fetch((window.BG_API_BASE || '') + `/api/compare/${id}`);
    if (!res.ok) throw new Error('Result not found');
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    showError(err.message);
  }
}

function renderResult(data) {
  const isRepro = Boolean(data.is_reproducible);
  const score = data.score || 0;

  // Page title badge
  const statusBadge = document.getElementById('statusBadge');
  if (statusBadge) {
    statusBadge.className = `badge ${isRepro ? 'badge-success' : 'badge-danger'}`;
    statusBadge.innerHTML = isRepro ? '✅ Reproducible' : '❌ Not Reproducible';
  }

  // Score circle
  const scoreNum = document.getElementById('scoreNumber');
  const scoreProgress = document.getElementById('scoreProgress');
  const scoreTitle = document.getElementById('scoreTitle');
  const scoreDesc = document.getElementById('scoreDesc');

  if (scoreNum) scoreNum.textContent = score + '%';
  if (scoreProgress) {
    const circumference = 408;
    const offset = circumference - (score / 100) * circumference;
    scoreProgress.classList.add(isRepro ? 'reproducible' : 'not-reproducible');
    setTimeout(() => {
      scoreProgress.style.strokeDashoffset = offset;
    }, 200);
  }

  if (scoreTitle) {
    scoreTitle.textContent = isRepro
      ? '🎉 Your Build is Reproducible!'
      : '⚠️ Build is Not Reproducible';
    scoreTitle.style.color = isRepro ? 'var(--green)' : 'var(--red)';
  }

  if (scoreDesc) {
    scoreDesc.textContent = isRepro
      ? 'Both builds produced the exact same output. Your C code passes the reproducibility check!'
      : 'The two builds produced different outputs. This means hidden differences exist in your binary.';
  }

  // Info cards
  setInfoValue('infoFilename', data.filename);
  setInfoValue('infoDate', formatDate(data.check_date));
  setInfoValue('infoSize', formatSize(data.file_size));
  setInfoValue('infoBuildTime', data.build_time_ms ? `${data.build_time_ms}ms` : 'N/A');

  // Hash comparison
  const hash1El = document.getElementById('hash1');
  const hash2El = document.getElementById('hash2');
  const hashMatch = document.getElementById('hashMatch');

  if (hash1El) hash1El.textContent = data.hash1 || 'N/A';
  if (hash2El) hash2El.textContent = data.hash2 || 'N/A';
  if (hashMatch) {
    hashMatch.className = `hash-match ${isRepro ? 'matched' : 'mismatched'}`;
    hashMatch.innerHTML = isRepro
      ? '✅ Hashes are identical — builds match perfectly'
      : '❌ Hashes are different — builds do not match';
  }

  // Causes section
  const causesSection = document.getElementById('causesSection');
  const causesList = document.getElementById('causesList');

  if (causesSection && causesList) {
    if (!isRepro && data.details && data.details.differences && data.details.differences.length) {
      causesSection.style.display = 'block';
      causesList.innerHTML = data.details.differences.map(c => `
        <div class="cause-item">
          <span class="cause-icon">${c.icon || '🔍'}</span>
          <div class="cause-body">
            <div class="cause-title">
              ${escapeHtml(c.cause)}
              <span class="badge badge-${c.severity === 'High' ? 'danger' : c.severity === 'Medium' ? 'warning' : 'success'}">${c.severity}</span>
            </div>
            <div class="cause-desc">${escapeHtml(c.description)}</div>
            <div class="cause-fix">💡 Fix: ${escapeHtml(c.fix)}</div>
          </div>
        </div>
      `).join('');
    } else if (isRepro) {
      causesSection.style.display = 'none';
    }
  }
}

function setInfoValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || 'N/A';
}

function showError(msg) {
  const container = document.getElementById('resultContainer');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 5rem 2rem;">
        <div class="empty-icon">❌</div>
        <h3>Error Loading Result</h3>
        <p>${escapeHtml(msg)}</p>
        <a href="${(window.BG_ORIGIN || window.location.origin)}/" class="btn btn-primary" style="margin-top:1.5rem;">← Back to Home</a>
      </div>`;
  }
}

// ======== HISTORY PAGE ========
let allHistory = [];

async function loadHistory() {
  await Promise.all([loadHistoryStats(), loadHistoryTable()]);
}

async function loadHistoryStats() {
  try {
    const res = await fetch((window.BG_API_BASE || '') + '/api/history/stats');
    const data = await res.json();

    setEl('hStatTotal', data.total);
    setEl('hStatRepro', data.reproducible);
    setEl('hStatFail', data.nonReproducible);
    setEl('hStatAvg', data.avgScore + '%');
  } catch (e) {}
}

async function loadHistoryTable() {
  const tbody = document.getElementById('historyBody');
  const emptyState = document.getElementById('historyEmpty');
  if (!tbody) return;

  try {
    const res = await fetch((window.BG_API_BASE || '') + '/api/history');
    allHistory = await res.json();
    renderTable(allHistory);

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allHistory.filter(r => r.filename.toLowerCase().includes(q));
        renderTable(filtered);
      });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        let filtered = allHistory;
        if (filter === 'pass') filtered = allHistory.filter(r => r.is_reproducible);
        if (filter === 'fail') filtered = allHistory.filter(r => !r.is_reproducible);
        renderTable(filtered);
      });
    });

  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Could not load history.</td></tr>`;
  }
}

function renderTable(data) {
  const tbody = document.getElementById('historyBody');
  const emptyState = document.getElementById('historyEmpty');

  if (!data.length) {
    if (tbody) tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = data.map(item => `
    <tr onclick="window.location=(window.BG_ORIGIN||window.location.origin)+'/results?id=${item.id}'" title="View result">
      <td>
        <span style="display:flex;align-items:center;gap:0.5rem;">
          <span>${item.is_reproducible ? '✅' : '❌'}</span>
          <span style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.filename)}</span>
        </span>
      </td>
      <td>${formatDate(item.check_date)}</td>
      <td>
        <span class="score-pill ${item.score >= 80 ? 'high' : 'low'}">${item.score}%</span>
      </td>
      <td>${formatSize(item.file_size)}</td>
      <td>${item.build_time_ms ? item.build_time_ms + 'ms' : 'N/A'}</td>
      <td>
        <button class="btn btn-danger" style="padding:0.3rem 0.7rem;font-size:0.78rem;"
          onclick="deleteRecord(event, ${item.id})">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteRecord(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this record?')) return;

  try {
    const res = await fetch((window.BG_API_BASE || '') + `/api/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    allHistory = allHistory.filter(r => r.id !== id);
    renderTable(allHistory);
    await loadHistoryStats();
    showToast('Record deleted!', 'success');
  } catch (err) {
    showToast('Could not delete record.', 'error');
  }
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str || '')));
  return div.innerHTML;
}