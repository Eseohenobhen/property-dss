// ============================================================
// reports.js
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await initUserUI();
  if (!profile) return;

  await populateFilters();
  await loadReport();

  document.getElementById('report-property')?.addEventListener('change', loadReport);
  document.getElementById('report-period')?.addEventListener('change', loadReport);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
});

async function populateFilters() {
  const { data: props } = await db.from('properties').select('id, name').order('name');
  const propSel = document.getElementById('report-property');
  (props || []).forEach(p => propSel?.add(new Option(p.name, p.id)));

  const { data: funds } = await db.from('maintenance_funds').select('period_label').order('period_label');
  const periodSel = document.getElementById('report-period');
  const periods = [...new Set((funds || []).map(f => f.period_label))];
  periods.forEach(p => periodSel?.add(new Option(p, p)));
}

async function loadReport() {
  const propFilter = document.getElementById('report-property').value;
  const periodFilter = document.getElementById('report-period').value;

  // Requests
  let reqQuery = db.from('maintenance_requests').select('*, properties(name)');
  if (propFilter) reqQuery = reqQuery.eq('property_id', propFilter);
  const { data: requests } = await reqQuery;

  // Allocations
  let allocQuery = db.from('fund_allocations').select(`
    *,
    maintenance_requests(title, category, properties(name)),
    profiles(full_name),
    maintenance_funds(period_label, property_id, properties(name))
  `);
  const { data: allocations } = await allocQuery;

  const reqs = requests || [];
  const allocs = (allocations || []).filter(a => {
    const p = a.maintenance_funds?.properties?.name;
    const period = a.maintenance_funds?.period_label;
    return (!propFilter || a.maintenance_funds?.property_id === propFilter)
      && (!periodFilter || period === periodFilter);
  });

  renderKPIs(reqs, allocs);
  renderCategoryChart(reqs);
  renderAllocationHistory(allocs);
  renderDeferred(reqs);
}

function renderKPIs(reqs, allocs) {
  const total = reqs.length;
  const pending = reqs.filter(r => r.status === 'pending').length;
  const completed = reqs.filter(r => r.status === 'completed').length;
  const totalAllocated = allocs.reduce((s, a) => s + Number(a.amount_assigned), 0);

  document.getElementById('report-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total Requests</div><div class="kpi-value">${total}</div><div class="kpi-sub">all time</div></div>
    <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-value">${pending}</div><div class="kpi-sub">awaiting action</div></div>
    <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-value">${completed}</div><div class="kpi-sub">resolved</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Allocated</div><div class="kpi-value" style="font-size:1.4rem">${fmtCurrency(totalAllocated)}</div><div class="kpi-sub">from funds</div></div>
  `;
}

function renderCategoryChart(reqs) {
  const cats = ['roofing','structural','electrical','plumbing','hvac','security','flooring','painting','landscaping','other'];
  const counts = {};
  cats.forEach(c => counts[c] = 0);
  reqs.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);

  const colors = {
    roofing:'var(--red)', structural:'#f08a54', electrical:'var(--accent)',
    plumbing:'var(--teal)', hvac:'#8390d8', security:'#d0c84a',
    flooring:'#a0a0bc', painting:'#8888aa', landscaping:'#66dd66', other:'var(--text-dim)'
  };

  const chartEl = document.getElementById('category-chart');
  chartEl.innerHTML = `<div class="bar-chart">${
    cats.filter(c => counts[c] > 0).map(c => `
      <div class="bar-row">
        <div class="bar-category">${c}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(counts[c]/max)*100}%;background:${colors[c]}"></div>
        </div>
        <div class="bar-count">${counts[c]}</div>
      </div>
    `).join('') || '<div class="empty-state">No data yet.</div>'
  }</div>`;
}

function renderAllocationHistory(allocs) {
  const tbody = document.getElementById('allocation-history-tbody');
  if (!allocs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No allocations recorded.</td></tr>';
    return;
  }
  tbody.innerHTML = allocs.map(a => `
    <tr>
      <td>${fmtDate(a.allocation_date)}</td>
      <td>${esc(a.maintenance_funds?.properties?.name ?? '—')}</td>
      <td>${esc(a.maintenance_requests?.title ?? '—')}</td>
      <td>${catBadge(a.maintenance_requests?.category ?? 'other')}</td>
      <td class="cost-cell">${fmtCurrency(a.amount_assigned)}</td>
      <td>${esc(a.profiles?.full_name ?? 'System')}</td>
    </tr>
  `).join('');
}

function renderDeferred(reqs) {
  const container = document.getElementById('deferred-list');
  const deferred = reqs
    .filter(r => r.status === 'pending' || r.status === 'deferred')
    .sort((a, b) => b.priority_score - a.priority_score);

  if (!deferred.length) {
    container.innerHTML = '<div class="empty-state">No pending or deferred requests. Great job! ✓</div>';
    return;
  }
  container.innerHTML = deferred.map((r, i) => `
    <div class="pq-item">
      <div class="pq-rank">#${i + 1}</div>
      <div class="pq-content">
        <div class="pq-title">${esc(r.title)}</div>
        <div class="pq-meta">${esc(r.properties?.name ?? '—')} · ${fmtDate(r.created_at)}</div>
      </div>
      ${catBadge(r.category)}
      ${statusBadge(r.status)}
      <div class="pq-score">${fmtScore(r.priority_score)}</div>
      <div class="cost-cell" style="font-size:0.8rem;flex-shrink:0">${fmtCurrency(r.estimated_cost)}</div>
    </div>
  `).join('');
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
