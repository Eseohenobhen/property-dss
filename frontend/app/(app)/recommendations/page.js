'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { fmtCurrency, fmtDateTime, fmtScore } from '@/lib/format';
import { STATUS_OPTIONS } from '@/lib/constants';
import { CategoryBadge, StatusBadge, SeverityBadge } from '@/components/Badges';
import Icon from '@/components/Icon';

export default function RecommendationsPage() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/requests').then(setItems).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const list = status ? items.filter((r) => r.status === status) : items;
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [items, status]);

  if (items === null) return <div className="page"><div className="loading"><div className="spinner" />Loading…</div></div>;

  return (
    <div className="page">
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty">
          {items.length === 0
            ? "You haven't logged any issues yet — use \u201cReport an Issue\u201d on the Maintenance page."
            : 'No requests match this filter.'}
        </div></div>
      ) : (
        <div className="rec-cards">
          {filtered.map((r) => {
            const allocation = r.allocations?.[0];
            return (
              <div key={r.id} className="card rec-card">
                <div className="rec-card-head">
                  <div>
                    <div className="rec-card-title">{r.title}</div>
                    <div className="rec-card-meta">
                      <CategoryBadge category={r.category} />
                      {r.severity && <SeverityBadge severity={r.severity} />}
                      <span className="muted">logged {fmtDateTime(r.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {r.description && <p className="rec-card-desc">{r.description}</p>}

                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div><div className="dl">Estimated cost</div><div className="dv">{fmtCurrency(r.estimatedCost)}</div></div>
                  <div><div className="dl">DSS priority score</div><div className="dv">{fmtScore(r.priorityScore)}</div></div>
                  {allocation && (
                    <div><div className="dl">Amount released</div><div className="dv">{fmtCurrency(allocation.amountAssigned)}</div></div>
                  )}
                </div>

                {r.status === 'REJECTED' && r.rejectionReason && (
                  <div className="form-alert error" style={{ marginTop: 12 }}>
                    <strong>Reason:</strong> {r.rejectionReason}
                  </div>
                )}
                {r.status === 'PENDING' && (
                  <div className="muted" style={{ marginTop: 12, fontSize: '.85rem' }}>Awaiting admin review.</div>
                )}

                <div style={{ marginTop: 14 }}>
                  <Link href={`/print/request/${r.id}`} target="_blank" className="btn btn-secondary btn-sm">
                    <Icon name="print" size={14} /> Print
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
