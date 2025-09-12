export function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(+d) ? new Date(0) : d;
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function timeShort(input: any) {
  const d = toDate(input);
  if (!+d) return '';
  const now = new Date();
  if (dateKey(d) === dateKey(now)) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString();
}