import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';
import { TripChecklist } from './TripChecklist';

export const dynamic = 'force-dynamic';

export default async function TripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase
    .from('packing_lists')
    .select('id, trip_name, destination, start_date, end_date, trip_type, weather_summary, packing_list_items(item_id, packed, items(id, title, brand, colour, category))')
    .eq('id', id)
    .maybeSingle();

  type Row = {
    id: string; trip_name: string; destination: string | null;
    start_date: string | null; end_date: string | null; trip_type: string | null;
    weather_summary: { place?: string; summary?: string } | null;
    packing_list_items: {
      item_id: string;
      packed: boolean;
      items: { id: string; title: string | null; brand: string | null; colour: string | null; category: Category } | null;
    }[] | null;
  };

  const t = trip as Row | null;
  if (!t) notFound();

  const grouped: Record<Category, { id: string; title: string; brand: string | null; colour: string | null; packed: boolean }[]> = {
    apparel: [], accessory: [], jewelry: [], silver: [], artwork: [],
  };
  for (const li of t.packing_list_items ?? []) {
    if (!li.items) continue;
    grouped[li.items.category].push({
      id: li.items.id,
      title: li.items.title ?? '(untitled)',
      brand: li.items.brand,
      colour: li.items.colour,
      packed: li.packed,
    });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={{ email: user.email }} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/packing" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
          ← Trips
        </Link>

        <h1 className="font-display text-4xl tracking-tight">{t.trip_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {[t.destination, [t.start_date, t.end_date].filter(Boolean).join(' → '), t.trip_type]
            .filter(Boolean).join(' · ') || 'No details set'}
        </p>

        {t.weather_summary?.summary ? (
          <div className="mt-6 rounded-md border border-border-subtle bg-bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Weather</p>
            <p className="mt-1 text-sm">
              {t.weather_summary.place ? `${t.weather_summary.place} · ` : ''}
              {t.weather_summary.summary}
            </p>
          </div>
        ) : null}

        <TripChecklist tripId={t.id} grouped={grouped} categories={CATEGORIES} categoryLabel={CATEGORY_LABEL} />
      </main>
    </div>
  );
}
