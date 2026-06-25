'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtCurrency, fmtDateTime } from '@/lib/format';
import { CATEGORIES, STATUSES } from '@/lib/constants';
import { CategoryBadge, StatusBadge } from '@/components/Badges';
import BarChart from '@/components/BarChart';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats/reports').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><div className="empty">{error}</div></div>;
  if (!data) return <div className="page"><div className="loading"><div className="spinner" />Loading reports…</div></div>;

  const { categoryBreakdown, statusBreakdown, allocationHistory, deferredRequests, fundUtilisation } = data;

  const categoryBars = categoryBreakdown.map((c) => ({
    label: CATEGORIES[c.category]?.label || c.category, value: c.count, color: CATEGORIES[c.category]?.color,
  }));
  const statusBars = statusBreakdown.map((s) => ({
    label: STATUSES[s.status]?.label || s.status, value: s.count, color: STATUSES[s.status]?.color,
  }));

  const totalAllocated = allocationHistory.reduce((sum, a) => sum + Number(a.amountAssigned), 0);

  return (
    <div className="page">
      <div className="two-col">
        <div className="card">
          <div className="section-head"><h3>Requests by Category</h3></div>
          <BarChart data={categoryBars} />
        </div>
        <div className="card">
          <div className="section-head"><h3>Requests by Status</h3></div>
          <BarChart data={statusBars} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h3>Fund Utilisation</h3></div>
        {fundUtilisation.length === 0 ? (
          <div className="empty">No funds yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Property</th><th>Period</th><th>Total</th><th>Allocated</th><th>Available</th></tr></thead>
              <tbody>
                {fundUtilisation.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.property}</strong></td>
                    <td className="muted">{f.periodLabel}</td>
                    <td className="cost-cell">{fmtCurrency(f.total)}</td>
                    <td className="cost-cell">{fmtCurrency(f.allocated)}</td>
                    <td className="cost-cell" style={{ color: 'var(--primary)' }}>{fmtCurrency(f.available)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head">
          <h3>Allocation Audit Trail</h3>
          <span className="tag">{fmtCurrency(totalAllocated)} total</span>
        </div>
        {allocationHistory.length === 0 ? (
          <div className="empty">No allocations recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Request</th><th>Category</th><th>Property</th><th>By</th><th>Amount</th></tr></thead>
              <tbody>
                {allocationHistory.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{fmtDateTime(a.allocationDate)}</td>
                    <td><strong>{a.request?.title}</strong></td>
                    <td>{a.request?.category && <CategoryBadge category={a.request.category} />}</td>
                    <td className="muted">{a.fund?.property?.name}</td>
                    <td className="muted">{a.allocatedBy?.fullName || '—'}</td>
                    <td className="cost-cell">{fmtCurrency(a.amountAssigned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head">
          <h3>Deferred Requests</h3>
          <span className="tag" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>{deferredRequests.length}</span>
        </div>
        {deferredRequests.length === 0 ? (
          <div className="empty">No deferred requests.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Request</th><th>Property</th><th>Category</th><th>Cost</th><th>Status</th></tr></thead>
              <tbody>
                {deferredRequests.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.title}</strong></td>
                    <td className="muted">{r.property?.name}</td>
                    <td><CategoryBadge category={r.category} /></td>
                    <td className="cost-cell">{fmtCurrency(r.estimatedCost)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
