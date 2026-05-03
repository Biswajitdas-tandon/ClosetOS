import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_LABEL, type Category } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export default async function OutfitDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data } = await supabase
    .from('outfits')
    .select('id, name, occasion, event_date, notes, created_at, outfit_items(item_id, role, items(id, title, brand, colour, category))')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  type OutfitData = {
    id: string;
    name: string | null;
    occasion: string | null;
    event_date: string | null;
    notes: string | null;
    created_at: string;
    outfit_items: { item_id: string; role: string | null; items: {
      id: string; title: string | null; brand: string | null; colour: string | null;
      category: Category;
    } | null }[] | null;
  };

  const o = data as unknown as OutfitData;
  const items = (o.outfit_items ?? []).map((oi) => oi.items).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="min-h-screen">
      <SiteHeader user={{ email: user.email }} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/outfits" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
          ← All outfits
        </Link>

        <h1 className="font-display text-4xl tracking-tight">
          {o.name ?? 'Untitled outfit'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {[o.occasion, o.event_date].filter(Boolean).join(' · ') || 'No date set'}
        </p>

        {o.notes ? (
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {o.notes}
          </p>
        ) : null}

        <h2 className="mt-10 mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">
          {items.length} item{items.length === 1 ? '' : 's'}
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/library/${it.id}`}
              className="rounded-md border border-border-subtle bg-bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <p className="text-xs uppercase tracking-wider text-text-muted">
                {CATEGORY_LABEL[it.category]}
              </p>
              <p className="mt-1 font-medium">{it.title ?? '(untitled)'}</p>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {[it.brand, it.colour].filter(Boolean).join(' · ')}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
