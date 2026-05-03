// Lightweight date utils — no dayjs/date-fns dep needed for what we use.

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthGrid(anchor: Date): Date[] {
  // Returns 42 dates (6 weeks) starting on the Sunday on/before the 1st.
  const first = startOfMonth(anchor);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

export function monthLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function daysAgo(target: string | Date | null | undefined): number | null {
  if (!target) return null;
  const t = typeof target === 'string' ? fromYmd(target) : target;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - t.getTime()) / 86400000);
}

export function relativeDay(target: string | Date | null | undefined): string {
  const n = daysAgo(target);
  if (n === null) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 7) return `${n} days ago`;
  if (n < 30) return `${Math.floor(n / 7)}w ago`;
  if (n < 365) return `${Math.floor(n / 30)}mo ago`;
  return `${Math.floor(n / 365)}y ago`;
}
