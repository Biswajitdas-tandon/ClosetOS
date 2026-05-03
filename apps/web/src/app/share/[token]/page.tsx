import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_LABEL, STATUS_LABEL, type Category, type Status } from '@closetos/domain';
import { createAdminClient } from '@closetos/db';
import { isSupabaseConfigured } from '@/lib/supabase';

// Public, read-only viewer for a share token. Uses the service-role client
// (server-only) so it can bypass RLS once the token has been validated.

export const dynamic = 'force-dynamic';

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isSupabaseConfigured()) notFound();

  const admin = createAdminClient();

  type ShareRow = {
    resource_type: 'folder' | 'item' | 'outfit';
    resource_id: string;
    permission: 'view' | 'edit';
    expires_at: string | null;
    owner_id: string;
  };

  const { data: shareRaw } = await admin
    .from('shared_access')
    .select('resource_type, resource_id, permission, expires_at, owner_id')
    .eq('share_token', token)
    .maybeSingle();
  const share = shareRaw as ShareRow | null;

  if (!share) {
    return <Gate title="Link not found" body="This share link doesn't exist or was revoked." />;
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return <Gate title="Link expired" body="This share link is no longer active." />;
  }

  if (share.resource_type === 'item') {
    return <ItemView id={share.resource_id} />;
  }
  if (share.resource_type === 'outfit') {
    return <OutfitView id={share.resource_id} />;
  }
  return <Gate title="Folder sharing coming soon" body="Folder shares aren't viewable yet." />;
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
      <Link
        href="/"
        className="mt-6 rounded-md border border-border-subtle px-4 py-2 text-sm hover:border-border-strong"
      >
        Go home
      </Link>
    </main>
  );
}

async function ItemView({ id }: { id: string }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('items')
    .select('id, title, brand, colour, material, price_amount, price_currency, status, notes, category, details')
    .eq('id', id)
    .maybeSingle();
  type ItemRow = {
    id: string; title: string | null; brand: string | null; colour: string | null;
    material: string | null; price_amount: number | null; price_currency: string;
    status: Status; notes: string | null; category: Category;
    details: Record<string, unknown> | null;
  };
  const item = data as ItemRow | null;
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1 text-xs text-text-muted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Shared with you · view only
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{CATEGORY_LABEL[item.category]}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{item.title ?? '(untitled)'}</h1>
      {item.brand ? <p className="mt-1 text-base text-text-secondary">{item.brand}</p> : null}

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border-subtle pt-6 text-sm">
        <FieldRow label="Status" value={STATUS_LABEL[item.status]} />
        {item.colour ? <FieldRow label="Colour" value={item.colour} /> : null}
        {item.material ? <FieldRow label="Material" value={item.material} /> : null}
        {item.price_amount != null ? (
          <FieldRow label="Price" value={`${item.price_currency ?? 'INR'} ${item.price_amount.toLocaleString()}`} />
        ) : null}
        {Object.entries(item.details ?? {}).map(([k, v]) =>
          v == null || v === '' ? null : <FieldRow key={k} label={prettyKey(k)} value={String(v)} />,
        )}
      </dl>

      {item.notes ? (
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{item.notes}</p>
      ) : null}

      <Footer />
    </main>
  );
}

async function OutfitView({ id }: { id: string }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('outfits')
    .select('id, name, occasion, event_date, notes, outfit_items(items(id, title, brand, colour, category))')
    .eq('id', id)
    .maybeSingle();
  type OutfitRow = {
    id: string; name: string | null; occasion: string | null; event_date: string | null;
    notes: string | null;
    outfit_items: { items: { id: string; title: string | null; brand: string | null; colour: string | null; category: Category } | null }[] | null;
  };
  const o = data as OutfitRow | null;
  if (!o) notFound();
  const items = (o.outfit_items ?? []).map((oi) => oi.items).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1 text-xs text-text-muted">
        Shared outfit · view only
      </div>
      <h1 className="font-display text-4xl tracking-tight">{o.name ?? 'Untitled outfit'}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {[o.occasion, o.event_date].filter(Boolean).join(' · ') || 'No date set'}
      </p>
      {o.notes ? (
        <p className="mt-6 whitespace-pre-wrap text-sm text-text-secondary">{o.notes}</p>
      ) : null}

      <h2 className="mt-10 mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">
        {items.length} item{items.length === 1 ? '' : 's'}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-md border border-border-subtle bg-bg-surface p-4">
            <p className="text-xs uppercase tracking-wider text-text-muted">{CATEGORY_LABEL[it.category]}</p>
            <p className="mt-1 font-medium">{it.title ?? '(untitled)'}</p>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {[it.brand, it.colour].filter(Boolean).join(' · ')}
            </p>
          </div>
        ))}
      </div>
      <Footer />
    </main>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-text-primary">{value}</dd>
    </div>
  );
}
function prettyKey(k: string) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function Footer() {
  return (
    <p className="mt-16 border-t border-border-subtle pt-6 text-xs text-text-muted">
      Shared via <Link href="/" className="underline">ClosetOS</Link>
    </p>
  );
}
