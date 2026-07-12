'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtCurrency, fmtDate } from '@/lib/format';
import { CATEGORIES, STATUSES } from '@/lib/constants';
import { CategoryBadge, StatusBadge } from '@/components/Badges';
import PrintHeader from '@/components/PrintHeader';

export default function GeneralReportPrintPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats/reports').then(setData).catch((e) => setError(e.message));
  }, []);

  if (!isAdmin) return <div className="print-page"><div className="empty">This report is only available to admins.</div></div>;
  if (error) return <div className="print-page"><div className="empty">{error}</div></div>;
  if (!data) return <div className="print-page"><div className="loading"><div className="spinner" />Loading…</div></div>;

  const { categoryBreakdown, statusBreakdown, allocationHistory, deferredRequests, fundUtilisation } = data;
  const totalAllocated = allocationHistory.reduce((s, a) => s + Number(a.amountAssigned), 0);
  const totalBudget = fundUtilisation.reduce((s, f) => s + Number(f.total), 0);
  const totalAvailable = fundUtilisation.reduce((s, f) => s + Number(f.available), 0);

  return (
    <div className="print-page">
      <PrintHeader title="General Report" subtitle="Portfolio-wide summary" />

      <section className="print-section">
        <h4>Portfolio Totals</h4>
        <div className="print-kv-grid">
          <div><span className="l">Total budget</span><span className="v">{fmtCurrency(totalBudget)}</span></div>
          <div><span className="l">Total allocated</span><span className="v">{fmtCurrency(totalAllocated)}</span></div>
          <div><span className="l">Total available</span><span className="v">{fmtCurrency(totalAvailable)}</span></div>
        </div>
      </section>

      <section className="print-section">
        <h4>Requests by Category</h4>
        <table className="print-table">
          <thead><tr><th>Category</th><th>Count</th><th>Total estimated cost</th></tr></thead>
          <tbody>
            {categoryBreakdown.map((c) => (
              <tr key={c.category}>
                <td>{CATEGORIES[c.category]?.label || c.category}</td>
                <td>{c._count._all}</td>
                <td>{fmtCurrency(c._sum.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h4>Requests by Status</h4>
        <table className="print-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            {statusBreakdown.map((s) => (
              <tr key={s.status}><td>{STATUSES[s.status]?.label || s.status}</td><td>{s._count._all}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h4>Fund Utilisation by Property</h4>
        <table className="print-table">
          <thead><tr><th>Property</th><th>Period</th><th>Total</th><th>Allocated</th><th>Available</th></tr></thead>
          <tbody>
            {fundUtilisation.map((f) => (
              <tr key={f.id}>
                <td>{f.property}</td><td>{f.periodLabel}</td>
                <td>{fmtCurrency(f.total)}</td><td>{fmtCurrency(f.allocated)}</td><td>{fmtCurrency(f.available)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h4>Full Allocation Audit Trail</h4>
        <table className="print-table">
          <thead><tr><th>Date</th><th>Request</th><th>Property</th><th>By</th><th>Amount</th></tr></thead>
          <tbody>
            {allocationHistory.map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.allocationDate)}</td>
                <td>{a.request?.title}</td>
                <td>{a.fund?.property?.name}</td>
                <td>{a.allocatedBy?.fullName || '—'}</td>
                <td>{fmtCurrency(a.amountAssigned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h4>Deferred Requests ({deferredRequests.length})</h4>
        {deferredRequests.length === 0 ? <p className="muted">None.</p> : (
          <table className="print-table">
            <thead><tr><th>Request</th><th>Property</th><th>Category</th><th>Cost</th></tr></thead>
            <tbody>
              {deferredRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td><td>{r.property?.name}</td>
                  <td><CategoryBadge category={r.category} /></td><td>{fmtCurrency(r.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
