import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';
import {
  addMonths, endOfMonth, monthGrid, monthLabel, startOfMonth, ymd,
} from '@/lib/dates';

type SearchParams = Promise<{ m?: string }>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { m } = await searchParams;
  const anchor = m ? new Date(m + '-01') : new Date();
  const grid = monthGrid(anchor);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const today = ymd(new Date());

  const { events, user, configured } = await loadEvents(monthStart, monthEnd);

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Calendar</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Log what you wear. Last-worn dates and cost-per-wear update automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?m=${ymd(addMonths(anchor, -1)).slice(0, 7)}`}
              prefetch={false}
              className="rounded-md border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm hover:border-border-strong"
            >
              ←
            </Link>
            <span className="min-w-[160px] text-center font-display text-lg">
              {monthLabel(anchor)}
            </span>
            <Link
              href={`/calendar?m=${ymd(addMonths(anchor, 1)).slice(0, 7)}`}
              prefetch={false}
              className="rounded-md border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm hover:border-border-strong"
            >
              →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-surface">
          <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-muted text-center text-xs font-medium uppercase tracking-wider text-text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const key = ymd(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = key === today;
              const dayEvents = events.filter((e) => e.event_date === key);
              return (
                <Link
                  key={key}
                  href={`/calendar/${key}`}
                  prefetch={false}
                  className={`relative flex aspect-square flex-col border-b border-r border-border-subtle p-2 text-left transition-colors hover:bg-bg-muted ${
                    inMonth ? '' : 'bg-bg-muted/40 text-text-muted'
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isToday
                        ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-text-onAccent'
                        : ''
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 ? (
                    <div className="mt-auto space-y-1">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className="truncate rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent"
                        >
                          {e.title ?? e.outfit_name ?? 'Outfit'}
                        </div>
                      ))}
                      {dayEvents.length > 2 ? (
                        <div className="text-[10px] text-text-muted">
                          +{dayEvents.length - 2} more
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        {!configured ? (
          <p className="mt-6 text-sm text-text-muted">
            Demo mode — connect Supabase to log real outfits.
          </p>
        ) : !user ? (
          <p className="mt-6 text-sm text-text-muted">
            <Link href="/login" className="underline">Sign in</Link> to log outfits.
          </p>
        ) : null}
      </main>
    </div>
  );
}

type EventRow = {
  id: string;
  event_date: string;
  title: string | null;
  outfit_id: string | null;
  outfit_name?: string | null;
};

async function loadEvents(start: Date, end: Date): Promise<{
  events: EventRow[]; user: { email?: string | null } | null; configured: boolean;
}> {
  if (!isSupabaseConfigured()) return { events: [], user: null, configured: false };
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { events: [], user: null, configured: true };

  const { data } = await supabase
    .from('calendar_events')
    .select('id, event_date, title, outfit_id, outfits(name)')
    .gte('event_date', ymd(start))
    .lte('event_date', ymd(end))
    .order('event_date', { ascending: true });

  type Row = {
    id: string; event_date: string; title: string | null; outfit_id: string | null;
    outfits: { name: string | null } | null;
  };
  const events: EventRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    event_date: r.event_date,
    title: r.title,
    outfit_id: r.outfit_id,
    outfit_name: r.outfits?.name ?? null,
  }));

  return { events, user: { email: user.email }, configured: true };
}
