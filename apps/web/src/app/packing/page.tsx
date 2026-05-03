import Link from 'next/link';
import { EmptyState } from '@closetos/ui';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type TripRow = {
  id: string;
  trip_name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  trip_type: string | null;
  weather_summary: { summary?: string; high_c?: number; low_c?: number } | null;
  packed_count: number;
  total_count: number;
};

export default async function PackingPage() {
  const { trips, user, configured } = await load();

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Packing lists</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Plan trips. Get suggestions based on weather and what you wear.
            </p>
          </div>
          <Link
            href="/packing/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
          >
            + New trip
          </Link>
        </div>

        {!configured ? (
          <EmptyState title="Demo mode" description="Connect Supabase to plan trips." />
        ) : !user ? (
          <EmptyState
            title="Sign in to plan trips"
            action={<Link href="/login" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent">Sign in</Link>}
          />
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create a trip — we'll fetch the weather and suggest items from your library."
            action={<Link href="/packing/new" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent">Plan first trip</Link>}
          />
        ) : (
          <div className="space-y-3">
            {trips.map((t) => (
              <Link
                key={t.id}
                href={`/packing/${t.id}`}
                prefetch={false}
                className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-medium text-text-primary">{t.trip_name}</h2>
                  <p className="mt-0.5 truncate text-sm text-text-secondary">
                    {[
                      t.destination,
                      [t.start_date, t.end_date].filter(Boolean).join(' → '),
                      t.trip_type,
                    ].filter(Boolean).join(' · ') || 'Unscheduled'}
                  </p>
                  {t.weather_summary?.summary ? (
                    <p className="mt-1 text-xs text-text-muted">
                      {t.weather_summary.summary}
                      {t.weather_summary.high_c != null
                        ? ` · ${Math.round(t.weather_summary.low_c ?? t.weather_summary.high_c)}–${Math.round(t.weather_summary.high_c)}°C`
                        : ''}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {t.packed_count} / {t.total_count}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">packed</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

async function load(): Promise<{
  trips: TripRow[]; user: { email?: string | null } | null; configured: boolean;
}> {
  if (!isSupabaseConfigured()) return { trips: [], user: null, configured: false };
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { trips: [], user: null, configured: true };

  const { data } = await supabase
    .from('packing_lists')
    .select('id, trip_name, destination, start_date, end_date, trip_type, weather_summary, packing_list_items(packed)')
    .order('start_date', { ascending: false });

  type RawRow = {
    id: string; trip_name: string; destination: string | null;
    start_date: string | null; end_date: string | null; trip_type: string | null;
    weather_summary: TripRow['weather_summary'];
    packing_list_items: { packed: boolean }[] | null;
  };

  const trips: TripRow[] = ((data ?? []) as unknown as RawRow[]).map((r) => {
    const total = r.packing_list_items?.length ?? 0;
    const packed = r.packing_list_items?.filter((i) => i.packed).length ?? 0;
    return {
      id: r.id,
      trip_name: r.trip_name,
      destination: r.destination,
      start_date: r.start_date,
      end_date: r.end_date,
      trip_type: r.trip_type,
      weather_summary: r.weather_summary,
      total_count: total,
      packed_count: packed,
    };
  });
  return { trips, user: { email: user.email }, configured: true };
}
