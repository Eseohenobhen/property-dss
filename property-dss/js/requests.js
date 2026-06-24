// ============================================================
// requests.js
// ============================================================

let allRequests = [];
let properties = [];

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await initUserUI();
  if (!profile) return;

  await loadPropertiesDropdown();
  await loadRequests();

  document.getElementById('filter-property')?.addEventListener('change', filterRequests);
  document.getElementById('filter-status')?.addEventListener('change', filterRequests);
  document.getElementById('filter-category')?.addEventListener('change', filterRequests);

  document.getElementById('add-request-btn')?.addEventListener('click', () => openRequestModal());
  document.getElementById('close-request-modal')?.addEventListener('click', () => closeModal('request-modal'));
  document.getElementById('cancel-request-modal')?.addEventListener('click', () => closeModal('request-modal'));
  document.getElementById('request-form')?.addEventListener('submit', saveRequest);

  // Live score preview
  ['req-urgency','req-impact','req-asset','req-cost','req-category'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLiveScore);
  });
});

async function loadPropertiesDropdown() {
  const { data } = await db.from('properties').select('id, name').order('name');
  properties = data || [];

  const filterSel = document.getElementById('filter-property');
  const formSel = document.getElementById('req-property');
  properties.forEach(p => {
    if (filterSel) filterSel.add(new Option(p.name, p.id));
    if (formSel) formSel.add(new Option(p.name, p.id));
  });
}

async function loadRequests() {
  const { data, error } = await db
    .from('maintenance_requests')
    .select('*, properties(name)')
    .order('priority_score', { ascending: false });

  if (error) { showToast('Error loading requests', 'error'); return; }
  allRequests = data || [];
  renderRequests(allRequests);
}

function renderRequests(reqs) {
  const tbody = document.getElementById('requests-tbody');
  const isAdmin = currentProfile?.role === 'admin';

  if (!reqs.length) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}" class="loading-state">No maintenance requests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = reqs.map((r, i) => `
    <tr>
      <td>${rankBadge(i + 1)}</td>
      <td><strong>${esc(r.title)}</strong></td>
      <td>${esc(r.properties?.name ?? '—')}</td>
      <td>${catBadge(r.category)}</td>
      <td class="score-cell">${fmtScore(r.priority_score)}</td>
      <td class="cost-cell">${fmtCurrency(r.estimated_cost)}</td>
      <td>${statusBadge(r.status)}</td>
      ${isAdmin ? `<td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon" onclick="editRequest('${r.id}')">Edit</button>
          <button class="btn-icon" style="color:var(--red)" onclick="deleteRequest('${r.id}')">Del</button>
        </div>
      </td>` : ''}
    </tr>
  `).join('');
}

function filterRequests() {
  const prop = document.getElementById('filter-property').value;
  const status = document.getElementById('filter-status').value;
  const cat = document.getElementById('filter-category').value;
  const filtered = allRequests.filter(r =>
    (!prop || r.property_id === prop) &&
    (!status || r.status === status) &&
    (!cat || r.category === cat)
  );
  renderRequests(filtered);
}

function openRequestModal(req = null) {
  document.getElementById('req-modal-title').textContent = req ? 'Edit Request' : 'New Maintenance Request';
  document.getElementById('req-id').value = req?.id || '';
  document.getElementById('req-property').value = req?.property_id || '';
  document.getElementById('req-category').value = req?.category || 'roofing';
  document.getElementById('req-title').value = req?.title || '';
  document.getElementById('req-description').value = req?.description || '';
  document.getElementById('req-urgency').value = req?.urgency || 5;
  document.getElementById('req-impact').value = req?.impact || 5;
  document.getElementById('req-asset').value = req?.asset_importance || 5;
  document.getElementById('req-cost').value = req?.estimated_cost || '';
  document.getElementById('req-status').value = req?.status || 'pending';
  document.getElementById('req-assigned').value = req?.assigned_to || '';
  document.getElementById('req-notes').value = req?.notes || '';
  hideFormError('req-error');
  updateLiveScore();
  openModal('request-modal');
}

function editRequest(id) {
  const req = allRequests.find(r => r.id === id);
  if (req) openRequestModal(req);
}

async function deleteRequest(id) {
  if (!confirm('Delete this maintenance request?')) return;
  const { error } = await db.from('maintenance_requests').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Request deleted', 'success');
  await loadRequests();
}

async function saveRequest(e) {
  e.preventDefault();
  hideFormError('req-error');

  const id = document.getElementById('req-id').value;
  const payload = {
    property_id: document.getElementById('req-property').value,
    category: document.getElementById('req-category').value,
    title: document.getElementById('req-title').value.trim(),
    description: document.getElementById('req-description').value.trim() || null,
    urgency: parseInt(document.getElementById('req-urgency').value),
    impact: parseInt(document.getElementById('req-impact').value),
    asset_importance: parseInt(document.getElementById('req-asset').value),
    estimated_cost: parseFloat(document.getElementById('req-cost').value),
    status: document.getElementById('req-status').value,
    assigned_to: document.getElementById('req-assigned').value.trim() || null,
    notes: document.getElementById('req-notes').value.trim() || null,
    requested_by: (await getCurrentUser()).id
  };

  let error;
  if (id) {
    ({ error } = await db.from('maintenance_requests').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('maintenance_requests').insert(payload));
  }

  if (error) { showFormError('req-error', error.message); return; }
  showToast(id ? 'Request updated!' : 'Request added!', 'success');
  closeModal('request-modal');
  await loadRequests();
}

function updateLiveScore() {
  const scoreEl = document.getElementById('live-score');
  if (!scoreEl) return;
  const u = parseInt(document.getElementById('req-urgency')?.value || 5);
  const i = parseInt(document.getElementById('req-impact')?.value || 5);
  const a = parseInt(document.getElementById('req-asset')?.value || 5);
  const c = parseFloat(document.getElementById('req-cost')?.value || 0);
  const cat = document.getElementById('req-category')?.value || 'other';
  if (!c) { scoreEl.textContent = '—'; return; }
  scoreEl.textContent = computePriorityScore({ urgency: u, impact: i, asset_importance: a, estimated_cost: c, category: cat });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
