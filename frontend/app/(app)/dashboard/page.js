'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtCurrency, fmtScore } from '@/lib/format';
import { CATEGORIES } from '@/lib/constants';
import { CategoryBadge, Rank } from '@/components/Badges';
import BarChart from '@/components/BarChart';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats/dashboard').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><div className="empty">{error}</div></div>;
  if (!stats) return <div className="page"><div className="loading"><div className="spinner" />Loading dashboard…</div></div>;

  const { counts, funds, priorityQueue, categoryBreakdown, recentAllocations } = stats;

  const barData = categoryBreakdown.map((c) => ({
    label: CATEGORIES[c.category]?.label || c.category,
    value: c.count,
    color: CATEGORIES[c.category]?.color,
  }));

  return (
    <div className="page">
      <div className="grid kpi-grid">
        <div className="kpi accent-green">
          <div className="kpi-label">Properties</div>
          <div className="kpi-value">{counts.totalProperties}</div>
          <div className="kpi-sub">{counts.activeProperties} active</div>
        </div>
        <div className="kpi accent-danger">
          <div className="kpi-label">Pending Requests</div>
          <div className="kpi-value">{counts.pendingRequests}</div>
          <div className="kpi-sub">{counts.totalRequests} total logged</div>
        </div>
        <div className="kpi accent-gold">
          <div className="kpi-label">Total Funds</div>
          <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{fmtCurrency(funds.total)}</div>
          <div className="kpi-sub">{funds.utilisation}% allocated</div>
        </div>
        <div className="kpi accent-sky">
          <div className="kpi-label">Available</div>
          <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{fmtCurrency(funds.available)}</div>
          <div className="kpi-sub">{fmtCurrency(funds.allocated)} committed</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-head">
            <h3>Priority Queue</h3>
            <span className="tag">DSS Ranked</span>
          </div>
          {priorityQueue.length === 0 ? (
            <div className="empty">No pending requests.</div>
          ) : (
            <div className="pq-list">
              {priorityQueue.map((r) => (
                <div className="pq-row" key={r.id}>
                  <Rank n={r.rank} />
                  <div className="pq-main">
                    <div className="pq-title">{r.title}</div>
                    <div className="pq-meta">
                      <CategoryBadge category={r.category} />
                      <span>· {r.property}</span>
                      <span>· {fmtCurrency(r.estimatedCost)}</span>
                    </div>
                  </div>
                  <div className="pq-score">{fmtScore(r.priorityScore)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-head"><h3>Requests by Category</h3></div>
          <BarChart data={barData} empty="No requests logged yet." />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h3>Recent Allocations</h3></div>
        {recentAllocations.length === 0 ? (
          <div className="empty">No allocations made yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Request</th><th>Property</th><th>Period</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {recentAllocations.map((a) => (
                  <tr key={a.id}>
                    <td>{a.request?.title}</td>
                    <td className="muted">{a.fund?.property?.name}</td>
                    <td className="muted">{a.fund?.periodLabel}</td>
                    <td className="cost-cell">{fmtCurrency(a.amountAssigned)}</td>
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
