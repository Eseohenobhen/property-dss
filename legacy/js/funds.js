// ============================================================
// funds.js
// ============================================================

let allFunds = [];

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await initUserUI();
  if (!profile) return;

  await loadFunds();
  await populatePropertyDropdown();

  document.getElementById('add-fund-btn')?.addEventListener('click', () => openFundModal());
  document.getElementById('close-fund-modal')?.addEventListener('click', () => closeModal('fund-modal'));
  document.getElementById('cancel-fund-modal')?.addEventListener('click', () => closeModal('fund-modal'));
  document.getElementById('fund-form')?.addEventListener('submit', saveFund);

  // Allocation section
  document.getElementById('alloc-fund-select')?.addEventListener('change', loadAllocRequests);
});

async function loadFunds() {
  const { data, error } = await db
    .from('maintenance_funds')
    .select('*, properties(name)')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error loading funds', 'error'); return; }
  allFunds = data || [];
  renderFunds(allFunds);
  populateFundDropdown(allFunds);
}

function renderFunds(funds) {
  const grid = document.getElementById('funds-grid');
  if (!funds.length) {
    grid.innerHTML = '<div class="empty-state">No maintenance funds yet.</div>';
    return;
  }
  grid.innerHTML = funds.map(f => {
    const avail = f.total_amount - f.allocated_amount;
    const pct = f.total_amount > 0 ? Math.min(100, (f.allocated_amount / f.total_amount) * 100) : 0;
    return `
      <div class="fund-card">
        <div class="fund-period">${esc(f.period_label)}</div>
        <div class="fund-property-name">${esc(f.properties?.name ?? '—')}</div>
        <div class="fund-bar-wrap"><div class="fund-bar" style="width:${pct}%"></div></div>
        <div class="fund-amounts">
          <span>Allocated: <strong>${fmtCurrency(f.allocated_amount)}</strong></span>
          <span>Available: <strong style="color:var(--green)">${fmtCurrency(avail)}</strong></span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-dim);margin-top:6px">Total: ${fmtCurrency(f.total_amount)}</div>
        ${currentProfile?.role === 'admin' ? `
        <div class="fund-card-actions">
          <button class="btn-icon" onclick="editFund('${f.id}')">Edit</button>
          <button class="btn-icon" style="color:var(--red)" onclick="deleteFund('${f.id}')">Delete</button>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function populateFundDropdown(funds) {
  const sel = document.getElementById('alloc-fund-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select fund —</option>';
  funds.forEach(f => {
    sel.add(new Option(`${f.properties?.name ?? '—'} · ${f.period_label}`, f.id));
  });
}

async function populatePropertyDropdown() {
  const { data } = await db.from('properties').select('id, name').order('name');
  const sel = document.getElementById('fund-property');
  if (!sel) return;
  (data || []).forEach(p => sel.add(new Option(p.name, p.id)));
}

async function loadAllocRequests() {
  const fundId = document.getElementById('alloc-fund-select').value;
  const balEl = document.getElementById('alloc-balance');
  const listEl = document.getElementById('alloc-requests-list');
  if (!fundId) { balEl.textContent = '—'; listEl.innerHTML = '<p class="empty-state">Select a fund to see eligible requests.</p>'; return; }

  const fund = allFunds.find(f => f.id === fundId);
  const avail = fund ? (fund.total_amount - fund.allocated_amount) : 0;
  balEl.textContent = fmtCurrency(avail);

  // Load pending requests for this property
  const { data: requests } = await db
    .from('maintenance_requests')
    .select('*')
    .eq('property_id', fund.property_id)
    .in('status', ['pending', 'approved'])
    .order('priority_score', { ascending: false });

  if (!requests || !requests.length) {
    listEl.innerHTML = '<p class="empty-state">No pending requests for this property.</p>';
    return;
  }

  let runningBalance = avail;
  listEl.innerHTML = requests.map((r, i) => {
    const canAfford = runningBalance >= r.estimated_cost;
    if (canAfford) runningBalance -= r.estimated_cost;
    return `
      <div class="alloc-item">
        <div style="flex-shrink:0">${rankBadge(i + 1)}</div>
        <div class="alloc-item-content">
          <div class="alloc-item-title">${esc(r.title)}</div>
          <div class="alloc-item-meta">${catBadge(r.category)} Score: ${fmtScore(r.priority_score)}</div>
        </div>
        <div class="alloc-cost">${fmtCurrency(r.estimated_cost)}</div>
        ${currentProfile?.role === 'admin' ? `<button class="btn-icon ${canAfford ? '' : 'disabled'}"
          onclick="allocateToRequest('${fundId}','${r.id}',${r.estimated_cost})"
          ${canAfford ? '' : 'disabled style="opacity:0.4"'}>
          ${canAfford ? 'Allocate' : 'Insufficient'}
        </button>` : ''}
      </div>
    `;
  }).join('');
}

async function allocateToRequest(fundId, requestId, amount) {
  if (!confirm(`Allocate ${fmtCurrency(amount)} to this request?`)) return;
  const fund = allFunds.find(f => f.id === fundId);
  const avail = fund.total_amount - fund.allocated_amount;
  if (amount > avail) { showToast('Insufficient funds', 'error'); return; }

  const user = await getCurrentUser();

  // Insert allocation record
  const { error: allocErr } = await db.from('fund_allocations').insert({
    fund_id: fundId,
    request_id: requestId,
    amount_assigned: amount,
    allocated_by: user.id
  });
  if (allocErr) { showToast('Error: ' + allocErr.message, 'error'); return; }

  // Update fund allocated amount
  const { error: fundErr } = await db.from('maintenance_funds')
    .update({ allocated_amount: fund.allocated_amount + amount })
    .eq('id', fundId);
  if (fundErr) { showToast('Error updating fund: ' + fundErr.message, 'error'); return; }

  // Update request status
  await db.from('maintenance_requests').update({ status: 'approved' }).eq('id', requestId);

  showToast('Fund allocated successfully!', 'success');
  await loadFunds();
  await loadAllocRequests();
}

function openFundModal(fund = null) {
  document.getElementById('fund-modal-title').textContent = fund ? 'Edit Fund' : 'Add Maintenance Fund';
  document.getElementById('fund-id').value = fund?.id || '';
  document.getElementById('fund-property').value = fund?.property_id || '';
  document.getElementById('fund-period').value = fund?.period_label || '';
  document.getElementById('fund-total').value = fund?.total_amount || '';
  hideFormError('fund-error');
  openModal('fund-modal');
}

function editFund(id) {
  const fund = allFunds.find(f => f.id === id);
  if (fund) openFundModal(fund);
}

async function deleteFund(id) {
  if (!confirm('Delete this fund record?')) return;
  const { error } = await db.from('maintenance_funds').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Fund deleted', 'success');
  await loadFunds();
}

async function saveFund(e) {
  e.preventDefault();
  hideFormError('fund-error');
  const id = document.getElementById('fund-id').value;
  const payload = {
    property_id: document.getElementById('fund-property').value,
    period_label: document.getElementById('fund-period').value.trim(),
    total_amount: parseFloat(document.getElementById('fund-total').value),
    allocated_amount: 0
  };
  let error;
  if (id) {
    ({ error } = await db.from('maintenance_funds').update({ total_amount: payload.total_amount, period_label: payload.period_label }).eq('id', id));
  } else {
    ({ error } = await db.from('maintenance_funds').insert(payload));
  }
  if (error) { showFormError('fund-error', error.message); return; }
  showToast(id ? 'Fund updated!' : 'Fund added!', 'success');
  closeModal('fund-modal');
  await loadFunds();
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
