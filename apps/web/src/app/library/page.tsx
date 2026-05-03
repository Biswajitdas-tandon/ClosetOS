import Link from 'next/link';
import { ItemCard, FilterChip, EmptyState } from '@closetos/ui';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';
import { DEMO_ITEMS } from '@/lib/demo-data';

type SearchParams = Promise<{ category?: string; q?: string }>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category, q } = await searchParams;
  const activeCategory = (CATEGORIES as readonly string[]).includes(category ?? '')
    ? (category as Category)
    : undefined;

  const { items, user, isDemo } = await loadItems({ category: activeCategory, q });
  const counts = countByCategory(items);

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Library</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isDemo
                ? 'Demo data — sign in to start your own collection.'
                : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            href="/library/add"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
          >
            + Add item
          </Link>
        </div>

        <SearchBar defaultValue={q ?? ''} category={activeCategory} />

        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChipLink label="All" active={!activeCategory} href={buildHref({ q })} />
          {CATEGORIES.map((c) => (
            <FilterChipLink
              key={c}
              label={CATEGORY_LABEL[c]}
              count={counts[c]}
              active={activeCategory === c}
              href={buildHref({ category: c, q })}
            />
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description={
              isDemo
                ? 'Connect Supabase and sign in to add your first item.'
                : 'Add your first item to start building your collection.'
            }
            action={
              <Link
                href="/library/add"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
              >
                Add item
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((it) => (
              <Link key={it.id} href={`/library/${it.id}`} className="contents">
                <ItemCard
                  id={it.id}
                  title={it.title}
                  subtitle={`${it.brand ?? ''} · ${CATEGORY_LABEL[it.category]}`}
                  imageUrl={it.imageUrl}
                  badge={it.colour ?? undefined}
                  status={it.status}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ----- helpers -----

type LibItem = {
  id: string;
  category: Category;
  title: string;
  brand?: string | null;
  colour?: string | null;
  status: 'available' | 'lent' | 'given_away' | 'sold';
  imageUrl?: string;
};

async function loadItems({
  category,
  q,
}: {
  category?: Category;
  q?: string;
}): Promise<{ items: LibItem[]; user: { email?: string | null } | null; isDemo: boolean }> {
  if (!isSupabaseConfigured()) {
    let items: LibItem[] = DEMO_ITEMS.map((d) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      brand: d.brand,
      colour: d.colour,
      status: d.status,
      imageUrl: d.imageUrl,
    }));
    if (category) items = items.filter((i) => i.category === category);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((i) =>
        [i.title, i.brand, i.colour].some((v) => v?.toLowerCase().includes(needle)),
      );
    }
    return { items, user: null, isDemo: true };
  }

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], user: null, isDemo: false };

  let query = supabase
    .from('items')
    .select('id, category, title, brand, colour, status, item_images(storage_path, is_primary)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (category) query = query.eq('category', category);
  if (q) query = query.textSearch('search_text', q, { config: 'english' });

  const { data, error } = await query;
  if (error) return { items: [], user: { email: user.email }, isDemo: false };

  const items: LibItem[] = (data ?? []).map((row) => ({
    id: row.id,
    category: row.category as Category,
    title: row.title ?? '(untitled)',
    brand: row.brand,
    colour: row.colour,
    status: row.status as LibItem['status'],
    imageUrl: undefined, // signed URL fetch happens client-side or via image proxy
  }));

  return { items, user: { email: user.email }, isDemo: false };
}

function countByCategory(items: LibItem[]): Record<Category, number> {
  const out = { apparel: 0, accessory: 0, jewelry: 0, silver: 0, artwork: 0 } as Record<Category, number>;
  for (const i of items) out[i.category]++;
  return out;
}

function buildHref({ category, q }: { category?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/library?${qs}` : '/library';
}

function FilterChipLink({
  label,
  active,
  count,
  href,
}: {
  label: string;
  active: boolean;
  count?: number;
  href: string;
}) {
  return (
    <Link href={href} prefetch={false}>
      <FilterChip label={label} active={active} count={count} />
    </Link>
  );
}

function SearchBar({ defaultValue, category }: { defaultValue: string; category?: Category }) {
  return (
    <form action="/library" method="get" className="mb-4 flex gap-2">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by title, brand, colour…"
        className="w-full max-w-md rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong"
      />
      <button
        type="submit"
        className="rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm hover:border-border-strong"
      >
        Search
      </button>
    </form>
  );
}
