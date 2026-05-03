import Link from 'next/link';
import { EmptyState } from '@closetos/ui';
import { CATEGORY_LABEL, type Category } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type WishlistRow = {
  id: string;
  title: string;
  image_url: string | null;
  source_url: string | null;
  category: Category | null;
  target_price: number | null;
  current_price: number | null;
  in_stock: boolean | null;
  notes: string | null;
};

export default async function WishlistPage() {
  const { items, user, configured } = await load();

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Wishlist</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Save what you&apos;re considering. Track price moves and availability.
            </p>
          </div>
          <Link
            href="/wishlist/add"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
          >
            + Add to wishlist
          </Link>
        </div>

        {!configured ? (
          <EmptyState title="Demo mode" description="Connect Supabase to start a wishlist." />
        ) : !user ? (
          <EmptyState
            title="Sign in to save items"
            action={<Link href="/login" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent">Sign in</Link>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Empty wishlist"
            description="Save items you're considering — drop a link or upload an image."
            action={<Link href="/wishlist/add" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent">Add first item</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it) => (
              <article
                key={it.id}
                className="overflow-hidden rounded-md bg-bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/5] bg-bg-muted">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-muted">No image</div>
                  )}
                  {it.in_stock === false ? (
                    <span className="absolute top-2 right-2 rounded-full bg-status-sold/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      Sold out
                    </span>
                  ) : null}
                </div>
                <div className="px-3 py-3">
                  <p className="truncate text-sm font-medium text-text-primary">{it.title}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                    <span>{it.category ? CATEGORY_LABEL[it.category] : '—'}</span>
                    {it.current_price != null ? (
                      <PriceTag current={it.current_price} target={it.target_price} />
                    ) : it.target_price != null ? (
                      <span>target ₹{it.target_price.toLocaleString()}</span>
                    ) : null}
                  </div>
                  {it.source_url ? (
                    <a
                      href={it.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-text-secondary hover:text-text-primary"
                    >
                      Open source ↗
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PriceTag({ current, target }: { current: number; target: number | null }) {
  const dropped = target != null && current <= target;
  return (
    <span className={dropped ? 'font-medium text-status-available' : ''}>
      ₹{current.toLocaleString()}{dropped ? ' ↓' : ''}
    </span>
  );
}

async function load(): Promise<{
  items: WishlistRow[]; user: { email?: string | null } | null; configured: boolean;
}> {
  if (!isSupabaseConfigured()) return { items: [], user: null, configured: false };
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], user: null, configured: true };
  const { data } = await supabase
    .from('wishlist')
    .select('*')
    .order('created_at', { ascending: false });
  return {
    items: ((data ?? []) as unknown as WishlistRow[]),
    user: { email: user.email },
    configured: true,
  };
}
