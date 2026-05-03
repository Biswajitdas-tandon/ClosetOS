import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { count: itemCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true });
  const has = (itemCount ?? 0) > 0;

  const steps = [
    {
      title: 'Add your first item',
      body: 'Snap a photo and we’ll auto-fill the details. Apparel, jewelry, art — anything you collect.',
      href: '/library/add',
      cta: 'Add item',
      done: has,
    },
    {
      title: 'Compose an outfit',
      body: 'Pull a few items together. Add a date and we’ll log it as worn.',
      href: '/outfits/new',
      cta: 'Compose outfit',
      done: false,
    },
    {
      title: 'Plan a trip',
      body: 'Tell us where + when. We’ll fetch the weather and suggest items from your library.',
      href: '/packing/new',
      cta: 'Plan trip',
      done: false,
    },
    {
      title: 'Make it yours',
      body: 'Pick a theme. Light, dark, or follow your system.',
      href: '#theme',
      cta: 'Use the toggle in the header',
      done: false,
    },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader user={{ email: user.email }} />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Welcome</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Let&apos;s set up your closet.</h1>
        <p className="mt-3 text-text-secondary">
          Four short steps. You can skip and come back any time.
        </p>

        <ol className="mt-10 space-y-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={`flex items-start gap-4 rounded-md border p-5 ${
                s.done
                  ? 'border-status-available/40 bg-status-available/5'
                  : 'border-border-subtle bg-bg-surface'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  s.done
                    ? 'bg-status-available text-white'
                    : 'border border-border-subtle text-text-secondary'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium">{s.title}</h2>
                <p className="mt-0.5 text-sm text-text-secondary">{s.body}</p>
              </div>
              {s.href.startsWith('#') ? (
                <span className="self-center text-xs text-text-muted">{s.cta}</span>
              ) : (
                <Link
                  href={s.href}
                  className="self-center rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-muted"
                >
                  {s.cta}
                </Link>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-10 flex items-center justify-between">
          <Link href="/library" className="text-sm text-text-secondary hover:text-text-primary">
            Skip to library →
          </Link>
        </div>
      </main>
    </div>
  );
}
