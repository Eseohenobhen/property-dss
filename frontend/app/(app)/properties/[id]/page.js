'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fmtCurrency, fmtNumber, fmtDate } from '@/lib/format';
import { PROPERTY_TYPES } from '@/lib/constants';
import { CategoryBadge, StatusBadge } from '@/components/Badges';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [property, setProperty] = useState(null);
  const [managers, setManagers] = useState(null);
  const [pickManagerId, setPickManagerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // { allocation, newAmount, reason }
  const [adjustErr, setAdjustErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [prop, mgrs] = await Promise.all([
        api.get(`/properties/${id}`),
        api.get('/users?role=MANAGER'),
      ]);
      setProperty(prop);
      setManagers(mgrs);
    } catch (e) { toast(e.message, 'error'); }
  }, [id, toast]);

  useEffect(() => {
    if (!isAdmin) { router.replace('/dashboard'); return; }
    load();
  }, [isAdmin, router, load]);

  async function assignManager(e) {
    e.preventDefault();
    if (!pickManagerId) return;
    setBusy(true);
    try {
      await api.post(`/properties/${id}/managers`, { managerId: pickManagerId });
      toast('Manager assigned', 'success');
      setPickManagerId('');
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }

  async function unassignManager(managerId, name) {
    if (!confirm(`Remove ${name} from this property?`)) return;
    try {
      await api.del(`/properties/${id}/managers/${managerId}`);
      toast('Manager unassigned', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function openAdjust(allocation) {
    setAdjustErr('');
    setAdjustModal({ allocation, newAmount: allocation.amountAssigned, reason: '' });
  }

  async function submitAdjust(e) {
    e.preventDefault();
    setAdjustErr(''); setBusy(true);
    try {
      await api.patch(`/allocations/${adjustModal.allocation.id}/adjust`, {
        newAmount: Number(adjustModal.newAmount),
        reason: adjustModal.reason,
      });
      toast('Fund adjusted', 'success');
      setAdjustModal(null);
      load();
    } catch (e) { setAdjustErr(e.message); } finally { setBusy(false); }
  }

  if (!isAdmin) return null;
  if (!property) return <div className="page"><div className="loading"><div className="spinner" />Loading property…</div></div>;

  const assignedIds = new Set(property.assignments?.map((a) => a.manager.id));
  const availableManagers = (managers || []).filter((m) => !assignedIds.has(m.id));

  return (
    <div className="page">
      <div className="filters" style={{ justifyContent: 'space-between' }}>
        <Link href="/properties" className="btn btn-secondary btn-sm">← Back to Properties</Link>
        <Link href={`/print/property/${id}`} target="_blank" className="btn btn-secondary btn-sm">
          <Icon name="print" size={15} /> Print Property Report
        </Link>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="prop-top" style={{ padding: 0 }}>
          <span className="type-pill">{PROPERTY_TYPES[property.propertyType]?.label}</span>
          <div className="prop-name" style={{ fontSize: '1.3rem' }}>{property.name}</div>
          <div className="prop-addr">{property.address}</div>
        </div>
        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div><div className="dl">Units</div><div className="dv">{fmtNumber(property.units)}</div></div>
          <div><div className="dl">Year built</div><div className="dv">{property.yearBuilt ?? '—'}</div></div>
          <div><div className="dl">Area</div><div className="dv">{property.totalAreaSqm ? `${fmtNumber(property.totalAreaSqm)} m²` : '—'}</div></div>
          <div><div className="dl">Status</div><div className="dv"><span className={`dot ${property.status}`} /> {property.status === 'ACTIVE' ? 'Active' : 'Inactive'}</div></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Assigned Managers</h3>
        {property.assignments?.length ? (
          <ul className="manager-list">
            {property.assignments.map((a) => (
              <li key={a.id}>
                <span><Icon name="userPlus" size={15} /> {a.manager.fullName} <span className="muted">({a.manager.email})</span></span>
                <button className="btn-icon danger" title="Unassign" onClick={() => unassignManager(a.manager.id, a.manager.fullName)}>
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No manager assigned yet — this property won't be visible on any manager's dashboard until one is.</div>
        )}

        <form onSubmit={assignManager} className="field-row" style={{ marginTop: 14, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Assign a manager</label>
            <select value={pickManagerId} onChange={(e) => setPickManagerId(e.target.value)}>
              <option value="">Select a manager…</option>
              {availableManagers.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" disabled={!pickManagerId || busy}>Assign</button>
        </form>
        {managers && availableManagers.length === 0 && managers.length > 0 && (
          <div className="muted" style={{ fontSize: '.85rem', marginTop: 8 }}>All manager accounts are already assigned here.</div>
        )}
        {managers && managers.length === 0 && (
          <div className="muted" style={{ fontSize: '.85rem', marginTop: 8 }}>No manager accounts exist yet — they'll appear here once someone registers with the Manager role.</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Funds</h3>
        {!property.funds?.length ? (
          <div className="empty">No fund set up for this property yet. <Link href="/funds">Add one on the Funds page.</Link></div>
        ) : property.funds.map((fund) => {
          const available = Number(fund.totalAmount) - Number(fund.allocatedAmount);
          return (
            <div key={fund.id} className="fund-block">
              <div className="fund-block-head">
                <div><strong>{fund.periodLabel}</strong></div>
                <div className="fund-figures">
                  <span>Total <b>{fmtCurrency(fund.totalAmount)}</b></span>
                  <span>Allocated <b>{fmtCurrency(fund.allocatedAmount)}</b></span>
                  <span>Available <b className={available < 0 ? 'text-danger' : ''}>{fmtCurrency(available)}</b></span>
                </div>
              </div>

              {fund.allocations?.length ? (
                <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Request</th><th>Released</th><th>DSS suggested</th><th>Approved by</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {fund.allocations.map((a) => (
                      <tr key={a.id}>
                        <td>{a.request?.title}</td>
                        <td>{fmtCurrency(a.amountAssigned)}</td>
                        <td className="muted">{a.suggestedAmount != null ? fmtCurrency(a.suggestedAmount) : '—'}</td>
                        <td>{a.allocatedBy?.fullName ?? '—'}</td>
                        <td className="muted">{fmtDate(a.allocationDate)}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(a)}>Adjust</button>
                        </td>
                      </tr>
                    ))}
                    {fund.allocations.map((a) => a.adjustments?.map((adj) => (
                      <tr key={adj.id} className="adjustment-row">
                        <td colSpan={6}>
                          <Icon name="arrowRight" size={13} /> Adjusted <strong>{a.request?.title}</strong>: {fmtCurrency(adj.previousAmount)} → {fmtCurrency(adj.newAmount)} — “{adj.reason}” ({adj.adjustedBy?.fullName ?? 'admin'}, {fmtDate(adj.createdAt)})
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 10, fontSize: '.85rem' }}>No funds released yet from this budget.</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Maintenance Requests</h3>
        {!property.requests?.length ? (
          <div className="empty">No maintenance requests logged for this property yet.</div>
        ) : (
          <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Score</th><th>Est. cost</th><th /></tr></thead>
            <tbody>
              {property.requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td><CategoryBadge category={r.category} /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.priorityScore != null ? Number(r.priorityScore).toFixed(2) : '—'}</td>
                  <td>{fmtCurrency(r.estimatedCost)}</td>
                  <td>
                    <Link href={`/print/request/${r.id}`} target="_blank" className="btn-icon" title="Print">
                      <Icon name="print" size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {adjustModal && (
        <Modal title="Adjust Released Funds" onClose={() => setAdjustModal(null)}>
          <form onSubmit={submitAdjust}>
            {adjustErr && <div className="form-alert error">{adjustErr}</div>}
            <div className="muted" style={{ marginBottom: 10, fontSize: '.9rem' }}>
              {adjustModal.allocation.request?.title} — currently released: <b>{fmtCurrency(adjustModal.allocation.amountAssigned)}</b>
              {adjustModal.allocation.suggestedAmount != null && (
                <> (DSS suggested {fmtCurrency(adjustModal.allocation.suggestedAmount)})</>
              )}
            </div>
            <div className="field">
              <label>New amount</label>
              <input
                type="number" min="0" step="1000" required
                value={adjustModal.newAmount}
                onChange={(e) => setAdjustModal((m) => ({ ...m, newAmount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reason for adjustment</label>
              <textarea
                required placeholder="e.g. Contractor found additional damage, extra ₦50,000 needed to complete the repair."
                value={adjustModal.reason}
                onChange={(e) => setAdjustModal((m) => ({ ...m, reason: e.target.value }))}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Adjustment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
