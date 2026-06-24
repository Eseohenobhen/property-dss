// ============================================================
// properties.js
// ============================================================

let allProperties = [];

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await initUserUI();
  if (!profile) return;

  await loadProperties();

  // Search & filter
  document.getElementById('search-properties')?.addEventListener('input', filterProperties);
  document.getElementById('filter-type')?.addEventListener('change', filterProperties);

  // Add property button (admin)
  document.getElementById('add-property-btn')?.addEventListener('click', () => openPropertyModal());

  // Modal close
  document.getElementById('close-property-modal')?.addEventListener('click', () => closeModal('property-modal'));
  document.getElementById('cancel-property-modal')?.addEventListener('click', () => closeModal('property-modal'));
  document.getElementById('close-detail-modal')?.addEventListener('click', () => closeModal('property-detail-modal'));

  // Form submit
  document.getElementById('property-form')?.addEventListener('submit', saveProperty);
});

async function loadProperties() {
  const { data, error } = await db
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error loading properties', 'error'); return; }
  allProperties = data || [];
  renderProperties(allProperties);
}

function renderProperties(props) {
  const grid = document.getElementById('property-grid');
  if (!props.length) {
    grid.innerHTML = '<div class="empty-state">No properties found. Admins can add the first one.</div>';
    return;
  }
  grid.innerHTML = props.map(p => `
    <div class="property-card" onclick="viewProperty('${p.id}')">
      <div class="property-card-header">
        <span class="property-type-badge">${p.property_type}</span>
        <div class="property-name">${esc(p.name)}</div>
        <div class="property-addr">${esc(p.address)}</div>
      </div>
      <div class="property-card-body">
        <div class="property-stats">
          <div class="prop-stat">
            <div class="prop-stat-val">${p.units}</div>
            <div class="prop-stat-label">Units</div>
          </div>
          ${p.year_built ? `<div class="prop-stat">
            <div class="prop-stat-val">${p.year_built}</div>
            <div class="prop-stat-label">Year Built</div>
          </div>` : ''}
          ${p.total_area_sqm ? `<div class="prop-stat">
            <div class="prop-stat-val">${Number(p.total_area_sqm).toLocaleString()}</div>
            <div class="prop-stat-label">sqm</div>
          </div>` : ''}
        </div>
      </div>
      <div class="property-card-footer status-${p.status}">
        <span><span class="status-dot"></span>${p.status}</span>
        ${currentProfile?.role === 'admin' ? `
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            <button class="btn-icon" onclick="editProperty('${p.id}')">Edit</button>
            <button class="btn-icon" style="color:var(--red)" onclick="deleteProperty('${p.id}')">Delete</button>
          </div>` : ''}
      </div>
    </div>
  `).join('');
}

function filterProperties() {
  const q = document.getElementById('search-properties').value.toLowerCase();
  const type = document.getElementById('filter-type').value;
  const filtered = allProperties.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    const matchType = !type || p.property_type === type;
    return matchQ && matchType;
  });
  renderProperties(filtered);
}

async function viewProperty(id) {
  const prop = allProperties.find(p => p.id === id);
  if (!prop) return;

  // Fetch maintenance count for this property
  const { count } = await db
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', id);

  document.getElementById('detail-prop-name').textContent = prop.name;
  document.getElementById('property-detail-content').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Type</label><div class="dval">${prop.property_type}</div></div>
      <div class="detail-item"><label>Status</label><div class="dval">${prop.status}</div></div>
      <div class="detail-item"><label>Units</label><div class="dval mono">${prop.units}</div></div>
      <div class="detail-item"><label>Year Built</label><div class="dval mono">${prop.year_built || '—'}</div></div>
      <div class="detail-item"><label>Area (sqm)</label><div class="dval mono">${prop.total_area_sqm ? Number(prop.total_area_sqm).toLocaleString() : '—'}</div></div>
      <div class="detail-item"><label>Maintenance Requests</label><div class="dval mono">${count ?? 0}</div></div>
    </div>
    <div class="detail-item" style="margin-bottom:12px">
      <label>Address</label>
      <div class="dval">${esc(prop.address)}</div>
    </div>
    ${prop.description ? `<div class="detail-item">
      <label>Description</label>
      <div class="dval" style="font-weight:400;line-height:1.6">${esc(prop.description)}</div>
    </div>` : ''}
    <div style="margin-top:20px;font-size:0.75rem;color:var(--text-dim)">Added ${fmtDate(prop.created_at)}</div>
  `;
  openModal('property-detail-modal');
}

function openPropertyModal(prop = null) {
  document.getElementById('modal-title').textContent = prop ? 'Edit Property' : 'Add Property';
  document.getElementById('prop-id').value = prop?.id || '';
  document.getElementById('prop-name').value = prop?.name || '';
  document.getElementById('prop-type').value = prop?.property_type || 'residential';
  document.getElementById('prop-address').value = prop?.address || '';
  document.getElementById('prop-units').value = prop?.units || 1;
  document.getElementById('prop-year').value = prop?.year_built || '';
  document.getElementById('prop-area').value = prop?.total_area_sqm || '';
  document.getElementById('prop-desc').value = prop?.description || '';
  document.getElementById('prop-status').value = prop?.status || 'active';
  hideFormError('prop-error');
  openModal('property-modal');
}

function editProperty(id) {
  const prop = allProperties.find(p => p.id === id);
  if (prop) openPropertyModal(prop);
}

async function deleteProperty(id) {
  if (!confirm('Delete this property and all its maintenance records?')) return;
  const { error } = await db.from('properties').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Property deleted', 'success');
  await loadProperties();
}

async function saveProperty(e) {
  e.preventDefault();
  hideFormError('prop-error');

  const id = document.getElementById('prop-id').value;
  const payload = {
    name: document.getElementById('prop-name').value.trim(),
    property_type: document.getElementById('prop-type').value,
    address: document.getElementById('prop-address').value.trim(),
    units: parseInt(document.getElementById('prop-units').value),
    year_built: parseInt(document.getElementById('prop-year').value) || null,
    total_area_sqm: parseFloat(document.getElementById('prop-area').value) || null,
    description: document.getElementById('prop-desc').value.trim() || null,
    status: document.getElementById('prop-status').value,
    created_by: (await getCurrentUser()).id
  };

  let error;
  if (id) {
    ({ error } = await db.from('properties').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('properties').insert(payload));
  }

  if (error) { showFormError('prop-error', error.message); return; }
  showToast(id ? 'Property updated!' : 'Property added!', 'success');
  closeModal('property-modal');
  await loadProperties();
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
