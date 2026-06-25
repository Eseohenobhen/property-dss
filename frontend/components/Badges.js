import { CATEGORIES, STATUSES } from '@/lib/constants';

export function CategoryBadge({ category }) {
  const c = CATEGORIES[category] || CATEGORIES.OTHER;
  return (
    <span className="badge" style={{ background: `${c.color}1f`, color: c.color }}>
      <span className="badge-dot" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.PENDING;
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export function Rank({ n }) {
  const cls = n === 1 ? 'r1' : n === 2 ? 'r2' : n === 3 ? 'r3' : '';
  return <span className={`rank ${cls}`}>{n}</span>;
}
