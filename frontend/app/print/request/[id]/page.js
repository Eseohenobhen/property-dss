'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { fmtCurrency, fmtDateTime } from '@/lib/format';
import { CATEGORIES, STATUSES } from '@/lib/constants';
import PrintHeader from '@/components/PrintHeader';

export default function RequestPrintPage() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/requests/${id}`).then(setR).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="print-page"><div className="empty">{error}</div></div>;
  if (!r) return <div className="print-page"><div className="loading"><div className="spinner" />Loading…</div></div>;

  const allocation = r.allocations?.[0];

  return (
    <div className="print-page">
      <PrintHeader title="Maintenance Recommendation" subtitle={r.title} />

      <section className="print-section">
        <div className="print-kv-grid">
          <div><span className="l">Property</span><span className="v">{r.property?.name}</span></div>
          <div><span className="l">Category</span><span className="v">{CATEGORIES[r.category]?.label || r.category}</span></div>
          <div><span className="l">Logged by</span><span className="v">{r.requestedBy?.fullName ?? '—'}</span></div>
          <div><span className="l">Logged on</span><span className="v">{fmtDateTime(r.createdAt)}</span></div>
          <div><span className="l">Status</span><span className="v">{STATUSES[r.status]?.label || r.status}</span></div>
          <div><span className="l">Estimated cost</span><span className="v">{fmtCurrency(r.estimatedCost)}</span></div>
        </div>
      </section>

      {r.description && (
        <section className="print-section">
          <h4>Description</h4>
          <p>{r.description}</p>
        </section>
      )}

      <section className="print-section">
        <h4>Decision Support Scoring</h4>
        <div className="print-kv-grid">
          <div><span className="l">Urgency</span><span className="v">{r.urgency}/10</span></div>
          <div><span className="l">Impact</span><span className="v">{r.impact}/10</span></div>
          <div><span className="l">Asset importance</span><span className="v">{r.assetImportance}/10</span></div>
          <div><span className="l">Priority score</span><span className="v">{r.priorityScore != null ? Number(r.priorityScore).toFixed(2) : '—'}</span></div>
        </div>
      </section>

      <section className="print-section">
        <h4>Admin Decision</h4>
        {r.status === 'PENDING' && <p className="muted">Awaiting review — no decision recorded yet.</p>}
        {r.status === 'REJECTED' && (
          <>
            <p>Rejected by {r.reviewedBy?.fullName ?? 'admin'} on {fmtDateTime(r.reviewedAt)}.</p>
            {r.rejectionReason && <p><strong>Reason:</strong> {r.rejectionReason}</p>}
          </>
        )}
        {allocation && (
          <>
            <div className="print-kv-grid">
              <div><span className="l">Amount released</span><span className="v">{fmtCurrency(allocation.amountAssigned)}</span></div>
              {allocation.suggestedAmount != null && (
                <div><span className="l">DSS suggested</span><span className="v">{fmtCurrency(allocation.suggestedAmount)}</span></div>
              )}
              <div><span className="l">Approved by</span><span className="v">{r.reviewedBy?.fullName ?? '—'}</span></div>
              <div><span className="l">Approved on</span><span className="v">{fmtDateTime(r.reviewedAt)}</span></div>
            </div>
            {allocation.adjustments?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <strong>Fund adjustments:</strong>
                {allocation.adjustments.map((adj) => (
                  <p key={adj.id} className="muted" style={{ fontSize: '.85rem', margin: '4px 0' }}>
                    {fmtCurrency(adj.previousAmount)} → {fmtCurrency(adj.newAmount)} — "{adj.reason}" ({fmtDateTime(adj.createdAt)})
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="print-section signoff">
        <h4>Sign-off</h4>
        <div className="signoff-grid">
          <div><span className="l">Contractor / technician</span><span className="line" /></div>
          <div><span className="l">Date completed</span><span className="line" /></div>
          <div><span className="l">Manager sign-off</span><span className="line" /></div>
          <div><span className="l">Admin sign-off</span><span className="line" /></div>
        </div>
      </section>
    </div>
  );
}
