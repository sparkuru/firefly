const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export function memoDateLabel(value) {
  return dateFormatter.format(new Date(value));
}

export function createMemoTimeIndex(records) {
  const entries = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const months = [];
  for (const [ordinal, entry] of entries.entries()) {
    if (!/^m_[A-Za-z0-9_-]{3,128}$/u.test(entry.id) || !Number.isFinite(new Date(entry.date).getTime())) throw new TypeError('Invalid public Memo time record.');
    if (months.at(-1)?.key !== memoDateLabel(entry.date).slice(0, 7)) {
      months.push({ key: memoDateLabel(entry.date).slice(0, 7), first: entry.id, indices: [] });
    }
    months.at(-1).indices.push(ordinal);
  }
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) throw new TypeError('Duplicate Memo time ID.');
  const count = months.length;
  const points = entries.map((entry) => {
    const key = memoDateLabel(entry.date).slice(0, 7);
    const month = months.findIndex((item) => item.key === key);
    const [year, number] = key.split('-').map(Number);
    const start = Date.UTC(year, number - 1, 1) - 8 * 60 * 60 * 1000;
    const end = Date.UTC(year, number, 1) - 8 * 60 * 60 * 1000;
    const fraction = Math.max(0, Math.min(1, (end - new Date(entry.date).getTime()) / (end - start)));
    return Object.freeze({ ...entry, month, position: (month + fraction) / count, label: memoDateLabel(entry.date) });
  });
  return Object.freeze({
    entries: Object.freeze(points),
    months: Object.freeze(months.map((month, index) => Object.freeze({ ...month, indices: Object.freeze(month.indices), start: index / count, end: (index + 1) / count })))
  });
}

export function nearestMemo(index, position) {
  if (!index.entries.length) return -1;
  const target = Math.max(0, Math.min(1, position));
  let low = 0;
  let high = index.entries.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (index.entries[middle].position < target) low = middle + 1;
    else high = middle;
  }
  if (low > 0 && Math.abs(index.entries[low - 1].position - target) <= Math.abs(index.entries[low].position - target)) return low - 1;
  return low;
}
