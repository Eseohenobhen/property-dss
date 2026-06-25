// Simple horizontal bar chart. data: [{ label, value, color }]
export default function BarChart({ data, empty = 'No data yet.' }) {
  if (!data || data.length === 0) return <div className="empty">{empty}</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-line" key={i}>
          <div className="bar-label">{d.label}</div>
          <div className="bar-outer">
            <div className="bar-inner" style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--primary)' }} />
          </div>
          <div className="bar-val">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
