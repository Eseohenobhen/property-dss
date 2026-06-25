export function serialize(value) {
  if (value === null || value === undefined) return value;

  // Prisma.Decimal instances expose toNumber()
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialize(v);
    }
    return out;
  }
  return value;
}

// Standard success response helper.
export function ok(res, data, status = 200) {
  return res.status(status).json({ data: serialize(data) });
}
