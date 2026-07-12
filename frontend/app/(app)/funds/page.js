'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fmtCurrency, fmtScore } from '@/lib/format';
import { CategoryBadge, Rank } from '@/components/Badges';
import Modal from '@/components/Modal';

export default function FundsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [funds, setFunds] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);     // fund id
  const [rec, setRec] = useState(null);               // recommendation payload
  const [recLoading, setRecLoading] = useState(false);
  const [amounts, setAmounts] = useState({});          // requestId -> editable approval amount
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ propertyId: '', periodLabel: '', totalAmount: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function loadFunds() {
    try { setFunds(await api.get('/funds')); }
    catch (e) { toast(e.message, 'error'); }
  }
  useEffect(() => {
    loadFunds();
    api.get('/properties').then(setProperties).catch(() => {});
  }, []);

  async function loadRecommendation(fundId) {
    setSelected(fundId); setRecLoading(true); setRec(null);
    try {
      const data = await api.get(`/funds/${fundId}/recommendation`);
      setRec(data);
      const initial = {};
      data.recommendations?.forEach((r) => { initial[r.requestId] = r.estimatedCost; });
      setAmounts(initial);
    }
    catch (e) { toast(e.message, 'error'); }
    finally { setRecLoading(false); }
  }

  function openCreate() { setForm({ propertyId: properties[0]?.id || '', periodLabel: '', totalAmount: '' }); setErr(''); setModal({ mode: 'create' }); }
  function openEdit(f) { setForm({ propertyId: f.propertyId, periodLabel: f.periodLabel, totalAmount: f.totalAmount }); setErr(''); setModal({ mode: 'edit', id: f.id }); }

  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const payload = { propertyId: form.propertyId, periodLabel: form.periodLabel, totalAmount: Number(form.totalAmount) };
    try {
      if (modal.mode === 'create') await api.post('/funds', payload);
      else await api.put(`/funds/${modal.id}`, payload);
      toast(modal.mode === 'create' ? 'Fund added' : 'Fund updated', 'success');
      setModal(null); loadFunds();
      if (selected) loadRecommendation(selected);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove(f) {
    if (!confirm(`Delete the ${f.periodLabel} fund for ${f.property?.name}?`)) return;
    try {
      await api.del(`/funds/${f.id}`); toast('Fund deleted', 'success');
      if (selected === f.id) { setSelected(null); setRec(null); }
      loadFunds();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function allocate(requestId, amount, suggestedAmount) {
    if (!amount || amount <= 0) { toast('Enter an amount greater than zero', 'error'); return; }
    const label = amount !== suggestedAmount
      ? `Approve and release ${fmtCurrency(amount)} (DSS suggested ${fmtCurrency(suggestedAmount)})?`
      : `Approve and release ${fmtCurrency(amount)} to this request?`;
    if (!confirm(label)) return;
    try {
      await api.post('/allocations', { fundId: selected, requestId, amountAssigned: amount, suggestedAmount });
      toast('Request approved and funded', 'success');
      await loadFunds();
      await loadRecommendation(selected);
    } catch (e) { toast(e.message, 'error'); }
  }

  // Persist the DSS's "defer" decision so it shows up on the Reports page.
  async function defer(requestId) {
    if (!confirm('Mark this request as deferred for now? It will move to the Deferred list in Reports.')) return;
    try {
      await api.put(`/requests/${requestId}`, { status: 'DEFERRED' });
      toast('Request deferred', 'success');
      await loadRecommendation(selected);
    } catch (e) { toast(e.message, 'error'); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="filters" style={{ justifyContent: 'flex-end' }}>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate} disabled={properties.length === 0}>+ Add Fund</button>}
      </div>

      {funds === null ? (
        <div className="loading"><div className="spinner" />Loading funds…</div>
      ) : funds.length === 0 ? (
        <div className="card"><div className="empty">No maintenance funds yet.{isAdmin && ' Add one to begin allocating.'}</div></div>
      ) : (
        <div className="grid cards-grid">
          {funds.map((f) => {
            const avail = Number(f.totalAmount) - Number(f.allocatedAmount);
            const pct = Number(f.totalAmount) > 0 ? Math.min(100, (Number(f.allocatedAmount) / Number(f.totalAmount)) * 100) : 0;
            return (
              <div key={f.id} className={`fund-card ${selected === f.id ? 'selected' : ''}`} onClick={() => loadRecommendation(f.id)} style={{ cursor: 'pointer' }}>
                <div className="fund-period">{f.periodLabel}</div>
                <div className="fund-prop">{f.property?.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                <div className="fund-amounts">
                  <span>Allocated <strong>{fmtCurrency(f.allocatedAmount)}</strong></span>
                  <span>Available <strong style={{ color: 'var(--primary)' }}>{fmtCurrency(avail)}</strong></span>
                </div>
                <div className="muted" style={{ fontSize: '.74rem', marginTop: 8 }}>Total budget: {fmtCurrency(f.totalAmount)}</div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(f)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DSS recommendation panel */}
      {selected && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h3>Allocation Recommendation</h3>
            <span className="tag">DSS Engine</span>
          </div>

          {recLoading ? (
            <div className="loading"><div className="spinner" />Running the decision engine…</div>
          ) : !rec ? null : (
            <>
              <div className="rec-summary">
                <div className="rec-stat"><div className="v" style={{ color: 'var(--primary)' }}>{fmtCurrency(rec.fund.availableAmount)}</div><div className="l">Available budget</div></div>
                <div className="rec-stat"><div className="v">{rec.summary.recommendedCount}</div><div className="l">Recommended</div></div>
                <div className="rec-stat"><div className="v">{rec.summary.deferredCount}</div><div className="l">Deferred</div></div>
                <div className="rec-stat"><div className="v">{fmtCurrency(rec.summary.recommendedTotal)}</div><div className="l">To commit</div></div>
                <div className="rec-stat"><div className="v">{rec.summary.budgetUtilisation}%</div><div className="l">Utilisation</div></div>
              </div>

              {rec.recommendations.length === 0 ? (
                <div className="empty">No outstanding requests to fund for this property.</div>
              ) : (
                <div>
                  {rec.recommendations.map((r) => (
                    <div key={r.requestId} className={`rec-row ${r.recommended ? 'funded' : ''}`}>
                      <Rank n={r.rank} />
                      <div className="rec-main">
                        <div className="rec-title">{r.title} &nbsp;<CategoryBadge category={r.category} /></div>
                        <div className="rec-reason">{r.reason}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="rec-cost">{fmtCurrency(r.estimatedCost)}</div>
                        <div className="muted" style={{ fontSize: '.72rem' }}>score {fmtScore(r.priorityScore)}</div>
                      </div>
                      {r.recommended ? (
                        isAdmin
                          ? (
                            <div className="approve-box">
                              <input
                                type="number" min="0" step="1000"
                                className="approve-amount"
                                value={amounts[r.requestId] ?? r.estimatedCost}
                                onChange={(e) => setAmounts((a) => ({ ...a, [r.requestId]: Number(e.target.value) }))}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => allocate(r.requestId, Number(amounts[r.requestId] ?? r.estimatedCost), r.estimatedCost)}>Approve</button>
                            </div>
                          )
                          : <span className="chip-funded">Recommended</span>
                      ) : (
                        isAdmin
                          ? <button className="btn btn-secondary btn-sm" onClick={() => defer(r.requestId)}>Mark deferred</button>
                          : <span className="chip-deferred">Deferred</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add Maintenance Fund' : 'Edit Fund'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            {err && <div className="form-alert error">{err}</div>}
            <div className="field"><label>Property</label>
              <select value={form.propertyId} onChange={set('propertyId')} required>
                <option value="">— Select —</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field"><label>Period label</label><input value={form.periodLabel} onChange={set('periodLabel')} required placeholder="e.g. Q1 2026" /></div>
              <div className="field"><label>Total amount (₦)</label><input type="number" min="0" step="1000" value={form.totalAmount} onChange={set('totalAmount')} required placeholder="e.g. 1500000" /></div>
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
