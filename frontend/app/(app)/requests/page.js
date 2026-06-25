'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fmtCurrency, fmtScore } from '@/lib/format';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import { previewScore } from '@/lib/score';
import { CategoryBadge, StatusBadge } from '@/components/Badges';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

const EMPTY = {
  propertyId: '', title: '', description: '', category: 'ROOFING',
  urgency: 5, impact: 5, assetImportance: 5, estimatedCost: '', status: 'PENDING', assignedTo: '', notes: '',
};

export default function RequestsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({ search: '', propertyId: '', status: '', category: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try { setItems(await api.get('/requests')); }
    catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => {
    load();
    api.get('/properties').then(setProperties).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((r) => {
      if (filters.search && !r.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.propertyId && r.propertyId !== filters.propertyId) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.category && r.category !== filters.category) return false;
      return true;
    });
  }, [items, filters]);

  function openCreate() {
    setForm({ ...EMPTY, propertyId: properties[0]?.id || '' }); setErr(''); setModal({ mode: 'create' });
  }
  function openEdit(r) {
    setForm({
      propertyId: r.propertyId, title: r.title, description: r.description ?? '', category: r.category,
      urgency: r.urgency, impact: r.impact, assetImportance: r.assetImportance, estimatedCost: r.estimatedCost,
      status: r.status, assignedTo: r.assignedTo ?? '', notes: r.notes ?? '',
    });
    setErr(''); setModal({ mode: 'edit', id: r.id });
  }

  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const payload = {
      ...form,
      urgency: Number(form.urgency), impact: Number(form.impact), assetImportance: Number(form.assetImportance),
      estimatedCost: Number(form.estimatedCost),
    };
    try {
      if (modal.mode === 'create') await api.post('/requests', payload);
      else await api.put(`/requests/${modal.id}`, payload);
      toast(modal.mode === 'create' ? 'Request logged' : 'Request updated', 'success');
      setModal(null); load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove(r) {
    if (!confirm(`Delete request "${r.title}"?`)) return;
    try { await api.del(`/requests/${r.id}`); toast('Request deleted', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const livePreview = previewScore(form);

  return (
    <div className="page">
      <div className="filters">
        <input placeholder="Search by title…" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        <select value={filters.propertyId} onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}>
          <option value="">All properties</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="spacer" />
        {isAdmin && <button className="btn btn-primary" onClick={openCreate} disabled={properties.length === 0}>+ New Request</button>}
      </div>

      <div className="card">
        {items === null ? (
          <div className="loading"><div className="spinner" />Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No requests match your filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Score</th><th>Title</th><th>Property</th><th>Category</th>
                  <th>Cost</th><th>Status</th>{isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="score-cell">{fmtScore(r.priorityScore)}</td>
                    <td><strong>{r.title}</strong></td>
                    <td className="muted">{r.property?.name}</td>
                    <td><CategoryBadge category={r.category} /></td>
                    <td className="cost-cell">{fmtCurrency(r.estimatedCost)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    {isAdmin && (
                      <td>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" onClick={() => openEdit(r)} title="Edit"><Icon name="edit" size={15} /></button>
                          <button className="btn-icon danger" onClick={() => remove(r)} title="Delete"><Icon name="trash" size={15} /></button>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Maintenance Request' : 'Edit Request'} onClose={() => setModal(null)} wide>
          <form onSubmit={save}>
            {err && <div className="form-alert error">{err}</div>}
            <div className="field-row">
              <div className="field"><label>Property</label>
                <select value={form.propertyId} onChange={set('propertyId')} required>
                  <option value="">— Select —</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} required placeholder="e.g. Leaking roof over Flat 3B" /></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} placeholder="optional" /></div>
            <div className="field-row three">
              <div className="field"><label>Urgency (1–10)</label><input type="number" min="1" max="10" value={form.urgency} onChange={set('urgency')} required /></div>
              <div className="field"><label>Impact (1–10)</label><input type="number" min="1" max="10" value={form.impact} onChange={set('impact')} required /></div>
              <div className="field"><label>Asset importance (1–10)</label><input type="number" min="1" max="10" value={form.assetImportance} onChange={set('assetImportance')} required /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Estimated cost (₦)</label><input type="number" min="0" step="1000" value={form.estimatedCost} onChange={set('estimatedCost')} required placeholder="e.g. 450000" /></div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="score-preview">
              <span className="l">DSS priority score (live preview)</span>
              <span className="v">{livePreview}</span>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
