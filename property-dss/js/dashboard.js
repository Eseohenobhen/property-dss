// ============================================================
// dashboard.js
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await initUserUI();
  if (!profile) return;

  await loadKPIs();
  await loadPriorityQueue();
  await loadRecentProperties();
});

async function loadKPIs() {
  const [
    { count: propCount },
    { data: pendingReqs },
    { data: funds }
  ] = await Promise.all([
    db.from('properties').select('*', { count: 'exact', head: true }),
    db.from('maintenance_requests').select('priority_score, status').eq('status', 'pending'),
    db.from('maintenance_funds').select('total_amount, allocated_amount')
  ]);

  const critical = (pendingReqs || []).filter(r => r.priority_score >= 8).length;
  const totalAvail = (funds || []).reduce((s, f) => s + (f.total_amount - f.allocated_amount), 0);

  document.getElementById('kpi-properties').textContent = propCount ?? '—';
  document.getElementById('kpi-pending').textContent = (pendingReqs || []).length;
  document.getElementById('kpi-critical').textContent = critical;
  document.getElementById('kpi-funds').textContent = fmtCurrency(totalAvail);
}

async function loadPriorityQueue() {
  const container = document.getElementById('priority-queue');

  const { data, error } = await db
    .from('maintenance_requests')
    .select('*, properties(name)')
    .in('status', ['pending', 'approved'])
    .order('priority_score', { ascending: false })
    .limit(8);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No pending requests. All clear! ✓</div>';
    return;
  }

  container.innerHTML = data.map((r, i) => `
    <div class="pq-item">
      <div class="pq-rank pq-rank-${i + 1}">#${i + 1}</div>
      <div class="pq-content">
        <div class="pq-title">${escHtml(r.title)}</div>
        <div class="pq-meta">${escHtml(r.properties?.name ?? '—')} · ${fmtDate(r.created_at)}</div>
      </div>
      ${catBadge(r.category)}
      ${statusBadge(r.status)}
      <div class="pq-score">${fmtScore(r.priority_score)}</div>
    </div>
  `).join('');
}

async function loadRecentProperties() {
  const container = document.getElementById('recent-properties');

  const { data, error } = await db
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No properties yet. Add your first property.</div>';
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="property-list-item">
      <div class="pli-icon">⌂</div>
      <div class="pli-content">
        <div class="pli-name">${escHtml(p.name)}</div>
        <div class="pli-addr">${escHtml(p.address)}</div>
      </div>
      <span class="property-type-badge">${p.property_type}</span>
    </div>
  `).join('');
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
