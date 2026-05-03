import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { AccountActions } from './AccountActions';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { count: itemCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true });
  const { count: outfitCount } = await supabase
    .from('outfits')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="min-h-screen">
      <SiteHeader user={{ email: user.email }} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-4xl tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in as <strong className="text-text-primary">{user.email}</strong>
        </p>

        <section className="mt-10 rounded-md border border-border-subtle bg-bg-surface p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Your data
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Stat label="Items" value={itemCount ?? 0} />
            <Stat label="Outfits" value={outfitCount ?? 0} />
          </dl>
          <p className="mt-6 text-sm text-text-secondary">
            Download a ZIP of every row and image you&apos;ve uploaded.
            Use it for backups or to migrate elsewhere.
          </p>
          <div className="mt-3">
            <a
              href="/api/account/export"
              className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover"
            >
              Download export (.zip)
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-md border border-status-sold/30 bg-bg-surface p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-status-sold">
            Danger zone
          </h2>
          <AccountActions email={user.email ?? ''} />
        </section>

        <p className="mt-10 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-primary">← Home</Link>
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-display">{value}</dd>
    </div>
  );
}
