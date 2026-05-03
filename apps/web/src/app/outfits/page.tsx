import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { EmptyState } from '@closetos/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

type OutfitRow = {
  id: string;
  name: string | null;
  occasion: string | null;
  event_date: string | null;
  item_count: number;
  primary_image?: string;
};

export default async function OutfitsPage() {
  const { outfits, user, configured } = await load();

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Outfits</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {outfits.length === 0
                ? 'Pull together looks from your library.'
                : `${outfits.length} saved`}
            </p>
          </div>
          <Link
            href="/outfits/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
          >
            + New outfit
          </Link>
        </div>

        {!configured ? (
          <EmptyState
            title="Demo mode"
            description="Connect Supabase to start composing outfits."
          />
        ) : !user ? (
          <EmptyState
            title="Sign in to compose outfits"
            action={
              <Link
                href="/login"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
              >
                Sign in
              </Link>
            }
          />
        ) : outfits.length === 0 ? (
          <EmptyState
            title="No outfits yet"
            description="Compose your first outfit by picking items from your library."
            action={
              <Link
                href="/outfits/new"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent hover:bg-accent-hover"
              >
                Compose outfit
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((o) => (
              <Link
                key={o.id}
                href={`/outfits/${o.id}`}
                prefetch={false}
                className="group block overflow-hidden rounded-md bg-bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[5/4] bg-bg-muted" />
                <div className="px-4 py-3">
                  <p className="font-medium text-text-primary">
                    {o.name ?? 'Untitled outfit'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {o.item_count} item{o.item_count === 1 ? '' : 's'}
                    {o.occasion ? ` · ${o.occasion}` : ''}
                    {o.event_date ? ` · ${o.event_date}` : ''}
                  </p>
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
  outfits: OutfitRow[]; user: { email?: string | null } | null; configured: boolean;
}> {
  if (!isSupabaseConfigured()) return { outfits: [], user: null, configured: false };
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { outfits: [], user: null, configured: true };

  const { data } = await supabase
    .from('outfits')
    .select('id, name, occasion, event_date, outfit_items(item_id)')
    .order('created_at', { ascending: false });

  type Row = {
    id: string; name: string | null; occasion: string | null; event_date: string | null;
    outfit_items: { item_id: string }[] | null;
  };

  const outfits: OutfitRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    occasion: r.occasion,
    event_date: r.event_date,
    item_count: r.outfit_items?.length ?? 0,
  }));

  return { outfits, user: { email: user.email }, configured: true };
}
