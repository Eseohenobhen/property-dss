'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fmtNumber } from '@/lib/format';
import { PROPERTY_TYPES, PROPERTY_TYPE_OPTIONS } from '@/lib/constants';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

const EMPTY = { name: '', address: '', propertyType: 'RESIDENTIAL', units: 1, yearBuilt: '', totalAreaSqm: '', description: '', status: 'ACTIVE' };

export default function PropertiesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try { setItems(await api.get('/properties')); }
    catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setErr(''); setModal({ mode: 'create' }); }
  function openEdit(p) {
    setForm({
      name: p.name, address: p.address, propertyType: p.propertyType, units: p.units,
      yearBuilt: p.yearBuilt ?? '', totalAreaSqm: p.totalAreaSqm ?? '', description: p.description ?? '', status: p.status,
    });
    setErr(''); setModal({ mode: 'edit', id: p.id });
  }

  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const payload = {
      ...form,
      units: Number(form.units),
      yearBuilt: form.yearBuilt === '' ? null : Number(form.yearBuilt),
      totalAreaSqm: form.totalAreaSqm === '' ? null : Number(form.totalAreaSqm),
    };
    try {
      if (modal.mode === 'create') await api.post('/properties', payload);
      else await api.put(`/properties/${modal.id}`, payload);
      toast(modal.mode === 'create' ? 'Property added' : 'Property updated', 'success');
      setModal(null); load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"? This also removes its requests and funds.`)) return;
    try { await api.del(`/properties/${p.id}`); toast('Property deleted', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="filters" style={{ justifyContent: 'flex-end' }}>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ Add Property</button>}
      </div>

      {items === null ? (
        <div className="loading"><div className="spinner" />Loading properties…</div>
      ) : items.length === 0 ? (
        <div className="card"><div className="empty">No properties yet.{isAdmin && ' Click “Add Property” to create one.'}</div></div>
      ) : (
        <div className="grid cards-grid">
          {items.map((p) => (
            <div className="prop-card" key={p.id}>
              <div className="prop-top">
                <span className="type-pill">{PROPERTY_TYPES[p.propertyType]?.label}</span>
                <div className="prop-name">{p.name}</div>
                <div className="prop-addr">{p.address}</div>
              </div>
              <div className="prop-body">
                <div className="stat"><div className="v">{fmtNumber(p.units)}</div><div className="l">Units</div></div>
                <div className="stat"><div className="v">{p._count?.requests ?? 0}</div><div className="l">Requests</div></div>
                <div className="stat"><div className="v">{p._count?.funds ?? 0}</div><div className="l">Funds</div></div>
              </div>
              <div className="manager-row">
                <Icon name="userPlus" size={14} />
                {p.assignments?.length
                  ? p.assignments.map((a) => a.manager.fullName).join(', ')
                  : <span className="muted">No manager assigned</span>}
              </div>
              <div className="prop-foot">
                <span className={`muted`} style={{ fontSize: '.8rem' }}>
                  <span className={`dot ${p.status}`} />{p.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
                {isAdmin && (
                  <span style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/properties/${p.id}`} className="btn-icon" title="Manage"><Icon name="arrowRight" size={15} /></Link>
                    <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><Icon name="edit" size={15} /></button>
                    <button className="btn-icon danger" onClick={() => remove(p)} title="Delete"><Icon name="trash" size={15} /></button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add Property' : 'Edit Property'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            {err && <div className="form-alert error">{err}</div>}
            <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
            <div className="field"><label>Address</label><input value={form.address} onChange={set('address')} required /></div>
            <div className="field-row">
              <div className="field"><label>Type</label>
                <select value={form.propertyType} onChange={set('propertyType')}>
                  {PROPERTY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="field-row three">
              <div className="field"><label>Units</label><input type="number" min="1" value={form.units} onChange={set('units')} required /></div>
              <div className="field"><label>Year built</label><input type="number" value={form.yearBuilt} onChange={set('yearBuilt')} placeholder="e.g. 2015" /></div>
              <div className="field"><label>Area (m²)</label><input type="number" step="0.01" value={form.totalAreaSqm} onChange={set('totalAreaSqm')} placeholder="optional" /></div>
            </div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} placeholder="optional" /></div>
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
