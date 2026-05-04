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
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
            {/* Text column */}
            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-text-muted">
                Personal inventory
              </p>
              <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
                Your wardrobe, jewelry, silver, and art —
                <span className="text-text-secondary"> in one calm place.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
                Add a photo, fill in the details, and find anything by colour,
                occasion, or the last time you wore it. Plan outfits. Pack for trips.
                Share folders with the people you trust.
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

            {/* Image collage — 4 categories, layered */}
            <HeroCollage />
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
      title: 'Photo-first intake',
      body: 'Add a photo, type the details, and save. Apparel, jewelry, silver, art — one form, the right fields per category.',
    },
    {
      title: 'Fast full-text search',
      body: 'Search across title, brand, colour, material, and notes. Filter by category, status, or folder.',
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
    <footer className="border-t border-border-subtle py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-text-muted sm:flex-row">
        <span>ClosetOS · {new Date().getFullYear()}</span>
        <a
          href="#"
          className="flex items-center gap-2 text-text-muted transition-colors hover:text-text-primary"
          aria-label="IT Squared"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/itsquared-logo.png"
            alt="IT Squared"
            width={28}
            height={28}
            className="h-7 w-7 rounded object-contain"
          />
          <span className="font-medium tracking-wide">IT Squared</span>
        </a>
      </div>
    </footer>
  );
}

// Layered hero image collage — one photo per category, arranged with subtle
// rotation and offset so they overlap like polaroids on a moodboard.
function HeroCollage() {
  // Hero photos are intentionally DIFFERENT from the demo grid below so the
  // visitor's eye doesn't see the same image twice on one page.
  const tiles: { label: string; url: string; rotate: string; translate: string }[] = [
    {
      label: 'Apparel',
      // Verified: "Woman wearing a white linen shirt" — editorial lifestyle
      url: 'https://images.unsplash.com/photo-1752825609278-f9696bc9d7bd?auto=format&fit=crop&w=600&q=70',
      rotate: '-rotate-3',
      translate: 'translate-y-2',
    },
    {
      label: 'Jewelry',
      // Verified: "silver diamond studded ring on black textile" — moody studio
      url: 'https://images.unsplash.com/photo-1607703829739-c05b7beddf60?auto=format&fit=crop&w=600&q=70',
      rotate: 'rotate-2',
      translate: '-translate-y-3',
    },
    {
      label: 'Silver',
      // Verified: "Ornate silver coffee pot and cup on display"
      url: 'https://images.unsplash.com/photo-1764861127777-a4022156402c?auto=format&fit=crop&w=600&q=70',
      rotate: 'rotate-1',
      translate: 'translate-y-1',
    },
    {
      label: 'Artwork',
      // Verified: "Two framed classical paintings hanging on a wall"
      url: 'https://images.unsplash.com/photo-1769690398960-3c8ede7ae905?auto=format&fit=crop&w=600&q=70',
      rotate: '-rotate-2',
      translate: '-translate-y-2',
    },
  ];

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {tiles.map((t) => (
          <figure
            key={t.label}
            className={`group relative overflow-hidden rounded-md bg-bg-muted shadow-md transition-transform duration-300 ease-editorial hover:rotate-0 hover:scale-[1.02] ${t.rotate} ${t.translate}`}
          >
            <div className="aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.url}
                alt={t.label}
                loading="eager"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="absolute left-3 top-3 rounded-full bg-bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-primary backdrop-blur">
              {t.label}
            </figcaption>
          </figure>
        ))}
      </div>
      {/* Soft glow behind the collage to lift it off the dark/light bg */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 blur-3xl"
      />
    </div>
  );
}
