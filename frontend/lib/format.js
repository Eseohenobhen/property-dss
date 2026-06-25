// Display formatting helpers.

export function fmtCurrency(value) {
  if (value == null || value === '') return '—';
  return '₦' + Number(value).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function fmtNumber(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-NG');
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtScore(value) {
  if (value == null) return '—';
  return Number(value).toFixed(2);
}

export function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
