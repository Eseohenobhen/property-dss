'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { fmtCurrency, fmtNumber, fmtDate, fmtScore } from '@/lib/format';
import { PROPERTY_TYPES } from '@/lib/constants';
import { CategoryBadge, StatusBadge } from '@/components/Badges';
import PrintHeader from '@/components/PrintHeader';

export default function PropertyReportPrintPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/properties/${id}`).then(setProperty).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="print-page"><div className="empty">{error}</div></div>;
  if (!property) return <div className="print-page"><div className="loading"><div className="spinner" />Loading…</div></div>;

  const totalBudget = property.funds.reduce((s, f) => s + Number(f.totalAmount), 0);
  const totalAllocated = property.funds.reduce((s, f) => s + Number(f.allocatedAmount), 0);
  const totalAvailable = totalBudget - totalAllocated;

  return (
    <div className="print-page">
      <PrintHeader title="Property Report" subtitle={property.name} />

      <section className="print-section">
        <h4>Property Details</h4>
        <div className="print-kv-grid">
          <div><span className="l">Name</span><span className="v">{property.name}</span></div>
          <div><span className="l">Type</span><span className="v">{PROPERTY_TYPES[property.propertyType]?.label}</span></div>
          <div><span className="l">Address</span><span className="v">{property.address}</span></div>
          <div><span className="l">Units</span><span className="v">{fmtNumber(property.units)}</span></div>
          <div><span className="l">Year built</span><span className="v">{property.yearBuilt ?? '—'}</span></div>
          <div><span className="l">Status</span><span className="v">{property.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></div>
        </div>
      </section>

      <section className="print-section">
        <h4>Assigned Managers</h4>
        {property.assignments?.length ? (
          <ul>
            {property.assignments.map((a) => (
              <li key={a.id}>{a.manager.fullName} ({a.manager.email})</li>
            ))}
          </ul>
        ) : <p className="muted">No manager currently assigned.</p>}
      </section>

      <section className="print-section">
        <h4>Fund Summary</h4>
        <div className="print-kv-grid">
          <div><span className="l">Total budget</span><span className="v">{fmtCurrency(totalBudget)}</span></div>
          <div><span className="l">Allocated</span><span className="v">{fmtCurrency(totalAllocated)}</span></div>
          <div><span className="l">Available</span><span className="v">{fmtCurrency(totalAvailable)}</span></div>
        </div>

        {property.funds.map((fund) => (
          <div key={fund.id} style={{ marginTop: 14 }}>
            <strong>{fund.periodLabel}</strong> — Total {fmtCurrency(fund.totalAmount)}, Allocated {fmtCurrency(fund.allocatedAmount)}
            {fund.allocations?.length > 0 && (
              <table className="print-table" style={{ marginTop: 8 }}>
                <thead><tr><th>Request</th><th>Released</th><th>DSS suggested</th><th>Approved by</th><th>Date</th></tr></thead>
                <tbody>
                  {fund.allocations.map((a) => (
                    <tr key={a.id}>
                      <td>{a.request?.title}</td>
                      <td>{fmtCurrency(a.amountAssigned)}</td>
                      <td>{a.suggestedAmount != null ? fmtCurrency(a.suggestedAmount) : '—'}</td>
                      <td>{a.allocatedBy?.fullName ?? '—'}</td>
                      <td>{fmtDate(a.allocationDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {fund.allocations?.some((a) => a.adjustments?.length > 0) && (
              <div style={{ marginTop: 6 }}>
                {fund.allocations.map((a) => a.adjustments?.map((adj) => (
                  <p key={adj.id} className="muted" style={{ fontSize: '.85rem', margin: '4px 0' }}>
                    Adjustment — {a.request?.title}: {fmtCurrency(adj.previousAmount)} → {fmtCurrency(adj.newAmount)}, "{adj.reason}" ({adj.adjustedBy?.fullName ?? 'admin'}, {fmtDate(adj.createdAt)})
                  </p>
                )))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="print-section">
        <h4>Maintenance Requests ({property.requests.length})</h4>
        {property.requests.length === 0 ? <p className="muted">None logged.</p> : (
          <table className="print-table">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Score</th><th>Est. cost</th></tr></thead>
            <tbody>
              {property.requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td><CategoryBadge category={r.category} /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtScore(r.priorityScore)}</td>
                  <td>{fmtCurrency(r.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
