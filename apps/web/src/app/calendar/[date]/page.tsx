import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { CATEGORY_LABEL, type Category } from '@closetos/domain';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  if (!isSupabaseConfigured()) redirect('/calendar');
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, location, notes, outfit_id, outfits(id, name, outfit_items(items(id, title, category)))')
    .eq('event_date', date)
    .order('created_at');

  type EventRow = {
    id: string;
    title: string | null;
    location: string | null;
    notes: string | null;
    outfit_id: string | null;
    outfits: {
      id: string; name: string | null;
      outfit_items: { items: { id: string; title: string | null; category: Category } | null }[] | null;
    } | null;
  };

  const rows = ((events ?? []) as unknown as EventRow[]) ?? [];
  const friendly = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen">
      <SiteHeader user={{ email: user.email }} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/calendar" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
          ← Calendar
        </Link>
        <h1 className="font-display text-4xl tracking-tight">{friendly}</h1>

        <div className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border-subtle bg-bg-surface p-8 text-center">
              <p className="text-text-secondary">Nothing logged for this day.</p>
              <Link
                href={`/outfits/new?date=${date}`}
                className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
              >
                Compose outfit for this day
              </Link>
            </div>
          ) : (
            <>
              {rows.map((e) => {
                const items = (e.outfits?.outfit_items ?? [])
                  .map((oi) => oi.items)
                  .filter((x): x is NonNullable<typeof x> => x !== null);
                return (
                  <div
                    key={e.id}
                    className="rounded-md border border-border-subtle bg-bg-surface p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                          {e.outfits ? 'Outfit' : 'Event'}
                        </p>
                        <h2 className="mt-1 text-xl font-medium">
                          {e.title ?? e.outfits?.name ?? 'Outfit'}
                        </h2>
                        {e.location ? (
                          <p className="text-sm text-text-secondary">{e.location}</p>
                        ) : null}
                      </div>
                      {e.outfits ? (
                        <Link
                          href={`/outfits/${e.outfits.id}`}
                          className="text-sm text-text-secondary hover:text-text-primary"
                        >
                          View →
                        </Link>
                      ) : null}
                    </div>

                    {items.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {items.map((it) => (
                          <Link
                            key={it.id}
                            href={`/library/${it.id}`}
                            className="rounded-full border border-border-subtle bg-bg-base px-3 py-1 text-xs hover:border-border-strong"
                          >
                            {it.title} <span className="text-text-muted">· {CATEGORY_LABEL[it.category]}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {e.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{e.notes}</p>
                    ) : null}
                  </div>
                );
              })}

              <div className="pt-2">
                <Link
                  href={`/outfits/new?date=${date}`}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  + Add another outfit for this day
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
