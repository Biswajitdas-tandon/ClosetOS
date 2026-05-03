import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_LABEL, STATUS_LABEL } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';
import { DEMO_ITEMS } from '@/lib/demo-data';
import { relativeDay } from '@/lib/dates';
import { ShareButton } from '@/components/ShareModal';

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let item:
    | {
        id: string;
        title: string;
        category: keyof typeof CATEGORY_LABEL;
        brand?: string | null;
        colour?: string | null;
        material?: string | null;
        price_amount?: number | null;
        price_currency?: string;
        status: keyof typeof STATUS_LABEL;
        notes?: string | null;
        details?: Record<string, unknown> | null;
        imageUrl?: string;
      }
    | null = null;

  if (!isSupabaseConfigured()) {
    const d = DEMO_ITEMS.find((x) => x.id === id);
    if (d) {
      item = {
        id: d.id,
        title: d.title,
        category: d.category,
        brand: d.brand,
        colour: d.colour,
        status: d.status,
        price_amount: d.price,
        price_currency: 'INR',
        details: d.details,
        imageUrl: d.imageUrl,
      };
    }
  } else {
    const supabase = await serverClient();
    const { data } = await supabase
      .from('items')
      .select('*, item_images(storage_path, is_primary)')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      item = {
        id: data.id,
        title: data.title ?? '(untitled)',
        category: data.category,
        brand: data.brand,
        colour: data.colour,
        material: data.material,
        price_amount: data.price_amount,
        price_currency: data.price_currency,
        status: data.status,
        notes: data.notes,
        details: data.details as Record<string, unknown>,
      };
    }
  }

  if (!item) notFound();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/library" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
          ← Library
        </Link>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="aspect-[4/5] overflow-hidden rounded-md bg-bg-muted">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted">No image</div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  {CATEGORY_LABEL[item.category]}
                </p>
                <h1 className="mt-2 font-display text-4xl tracking-tight">{item.title}</h1>
                {item.brand ? (
                  <p className="mt-1 text-base text-text-secondary">{item.brand}</p>
                ) : null}
              </div>
              {item.id.length === 36 ? <ShareButton resourceType="item" resourceId={item.id} /> : null}
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border-subtle pt-6 text-sm">
              <Field label="Status" value={STATUS_LABEL[item.status]} />
              {item.colour ? <Field label="Colour" value={item.colour} /> : null}
              {item.material ? <Field label="Material" value={item.material} /> : null}
              {item.price_amount != null ? (
                <Field
                  label="Price"
                  value={`${item.price_currency ?? 'INR'} ${item.price_amount.toLocaleString()}`}
                />
              ) : null}
              {Object.entries(item.details ?? {})
                .filter(([k]) => k !== 'last_worn_date')
                .map(([k, v]) =>
                  v == null || v === '' ? null : (
                    <Field key={k} label={prettyKey(k)} value={String(v)} />
                  ),
                )}
              {(item.details as Record<string, unknown>)?.last_worn_date ? (
                <Field
                  label="Last worn"
                  value={`${relativeDay(String((item.details as Record<string, unknown>).last_worn_date))}`}
                />
              ) : null}
              {item.price_amount != null && (item.details as Record<string, unknown>)?.wear_count
                ? (
                  <Field
                    label="Cost per wear"
                    value={`${item.price_currency ?? 'INR'} ${(
                      item.price_amount /
                      Number((item.details as Record<string, unknown>).wear_count)
                    ).toFixed(0)}`}
                  />
                ) : null}
            </dl>

            {item.notes ? (
              <div className="mt-8">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Notes
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {item.notes}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
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
