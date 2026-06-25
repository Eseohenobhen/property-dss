// ============================================================
// ui.js — Shared UI Utilities (loaded on every app page)
// ============================================================

let currentProfile = null;

// ---- Toast Notifications ----
function createToast() {
  const t = document.createElement('div');
  t.id = 'toast';
  document.body.appendChild(t);
  return t;
}
const toastEl = createToast();

function showToast(msg, type = 'info', duration = 3500) {
  toastEl.textContent = msg;
  toastEl.className = `show ${type}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toastEl.className = toastEl.className.replace('show', '').trim();
  }, duration);
}

// ---- User profile init (called from every page) ----
async function initUserUI() {
  const session = await requireAuth();
  if (!session) return null;

  currentProfile = await getUserProfile(session.user.id);
  if (!currentProfile) {
    await db.auth.signOut();
    window.location.href = '../index.html';
    return null;
  }

  // Populate sidebar
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = currentProfile.full_name;
  if (roleEl) {
    roleEl.textContent = currentProfile.role;
    roleEl.className = `user-role-badge ${currentProfile.role}`;
  }
  if (avatarEl) {
    avatarEl.textContent = (currentProfile.full_name || 'U')[0].toUpperCase();
  }

  // Show admin-only elements
  if (currentProfile.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  // Sign out
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await db.auth.signOut();
      window.location.href = '../index.html';
    });
  }

  // Sidebar toggle (mobile)
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  return currentProfile;
}

// ---- Formatting helpers ----
function fmtCurrency(val) {
  if (val == null) return '—';
  return '₦' + Number(val).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtScore(s) {
  if (s == null) return '—';
  return Number(s).toFixed(2);
}

function catBadge(cat) {
  const labels = {
    roofing: '🏠 Roofing',
    structural: '🏗 Structural',
    electrical: '⚡ Electrical',
    plumbing: '🔧 Plumbing',
    hvac: '❄ HVAC',
    flooring: '▭ Flooring',
    painting: '🎨 Painting',
    security: '🔒 Security',
    landscaping: '🌿 Landscaping',
    other: 'Other'
  };
  return `<span class="pq-cat-badge cat-${cat}">${labels[cat] || cat}</span>`;
}

function statusBadge(s) {
  return `<span class="status-badge status-${s}">${s.replace('_', ' ')}</span>`;
}

function rankBadge(rank) {
  let cls = '';
  if (rank === 1) cls = 'rank-top1';
  else if (rank === 2) cls = 'rank-top2';
  else if (rank === 3) cls = 'rank-top3';
  return `<span class="priority-rank-badge ${cls}">${rank}</span>`;
}

// ---- Client-side priority score (mirrors SQL function) ----
function computePriorityScore({ urgency, impact, asset_importance, estimated_cost, category }) {
  const catBoosts = {
    roofing: 2.0, structural: 1.8, electrical: 1.5, plumbing: 1.2,
    hvac: 0.8, security: 1.0, flooring: 0.0, painting: -0.5, landscaping: 0.0, other: 0.0
  };
  const costScore = Math.min(10, Math.max(1, estimated_cost / 500000));
  const boost = catBoosts[category] ?? 0;
  const raw = (urgency * 0.35) + (impact * 0.30) + (asset_importance * 0.20) - (costScore * 0.15) + boost;
  return Math.max(0, raw).toFixed(2);
}

// ---- Modal helpers ----
function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideFormError(id) {
  document.getElementById(id)?.classList.add('hidden');
}
