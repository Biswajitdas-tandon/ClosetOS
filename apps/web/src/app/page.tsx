import Link from 'next/link';
import { ItemCard } from '@closetos/ui';
import { CATEGORY_LABEL } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { DEMO_ITEMS } from '@/lib/demo-data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  let user: { email?: string | null } | null = null;
  if (configured) {
    const supabase = await serverClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) user = { email: data.user.email };
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main>
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-20 md:pt-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-text-muted">
              Personal inventory
            </p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
              Your wardrobe, jewelry, silver, and art —
              <span className="text-text-secondary"> in one calm place.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Snap a photo. AI fills in the details. Search by colour, occasion, or
              the last time you wore it. Plan outfits. Pack for trips. Share folders
              with the people you trust.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/library"
                className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
              >
                Open library
              </Link>
              <Link
                href="/library/add"
                className="rounded-md border border-border-strong px-5 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-muted"
              >
                Add an item
              </Link>
              {!configured ? (
                <span className="ml-2 text-xs text-text-muted">
                  · Demo mode — connect Supabase to enable accounts
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl text-text-primary">A look inside</h2>
            <span className="text-xs uppercase tracking-widest text-text-muted">
              {Object.keys(CATEGORY_LABEL).length} categories
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {DEMO_ITEMS.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={`${item.brand} · ${CATEGORY_LABEL[item.category]}`}
                imageUrl={item.imageUrl}
                badge={item.colour}
                status={item.status}
              />
            ))}
          </div>
        </section>

        <FeatureGrid />
      </main>
      <SiteFooter />
    </div>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: 'AI photo intake',
      body: 'Drop a photo. We auto-detect type, colour, pattern, and brand — you confirm in two taps.',
    },
    {
      title: 'Natural-language search',
      body: '“Black shirts I wore last winter” returns exactly that, ranked by recency.',
    },
    {
      title: 'Outfit calendar',
      body: 'Log what you wore. Cost-per-wear and last-worn dates update automatically.',
    },
    {
      title: 'Packing lists',
      body: 'Tell us your trip. We suggest items based on weather and what you actually wear.',
    },
    {
      title: 'Folders & sharing',
      body: 'Nest folders by season, person, or location. Share view or edit access by link.',
    },
    {
      title: 'Privacy by default',
      body: 'EXIF & GPS stripped from every upload. Your photos live in your private storage.',
    },
  ];
  return (
    <section className="border-t border-border-subtle bg-bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-10 max-w-2xl font-display text-3xl text-text-primary md:text-4xl">
          Designed for the way collections actually grow.
        </h2>
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title}>
              <h3 className="mb-2 text-base font-medium text-text-primary">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle py-10 text-center text-xs text-text-muted">
      ClosetOS · early build · {new Date().getFullYear()}
    </footer>
  );
}
