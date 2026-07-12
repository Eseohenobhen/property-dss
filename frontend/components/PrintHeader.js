'use client';

import { useAuth } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';

export default function PrintHeader({ title, subtitle }) {
  const { user } = useAuth();
  return (
    <div className="print-header">
      <div className="print-header-row">
        <div>
          <div className="print-brand">PropertyDSS</div>
          <div className="print-title">{title}</div>
          {subtitle && <div className="print-subtitle">{subtitle}</div>}
        </div>
        <button className="btn btn-primary no-print" onClick={() => window.print()}>Print</button>
      </div>
      <div className="print-meta">
        Generated {fmtDateTime(new Date())} by {user?.fullName} ({user?.role === 'ADMIN' ? 'Admin' : 'Manager'})
      </div>
      <hr />
    </div>
  );
}
