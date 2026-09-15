'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FIELDS_BY_CATEGORY,
  ItemSchema,
  STATUS_LABEL,
  STATUS_VALUES,
  type Category,
} from '@closetos/domain';
import { browserClient } from '@/lib/supabase';

type FormState = Record<string, string | number | undefined>;

// Shared by /library/add (no `existing`) and /library/[id]/edit (`existing` set).
export type ExistingItem = {
  id: string;
  category: Category;
  title: string | null;
  brand: string | null;
  colour: string | null;
  material: string | null;
  price_amount: number | null;
  purchase_date: string | null;
  notes: string | null;
  status: string;
  details: Record<string, unknown> | null;
  imageUrl?: string;
};

export function ItemForm({ existing }: { existing?: ExistingItem }) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [category, setCategory] = useState<Category>(existing?.category ?? 'apparel');
  const [values, setValues] = useState<FormState>(() =>
    existing ? flattenExisting(existing) : {},
  );
  const [status, setStatus] = useState<string>(existing?.status ?? 'available');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(existing?.imageUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => FIELDS_BY_CATEGORY[category], [category]);

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload(category, values, status, existing?.details ?? null);
      const parsed = ItemSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid form');
      }
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      let itemId = existing?.id;
      if (isEdit && itemId) {
        // Null out cleared fields so an edit can remove a value, not just set one.
        const row = {
          ...parsed.data,
          title: parsed.data.title ?? null,
          brand: parsed.data.brand ?? null,
          colour: parsed.data.colour ?? null,
          material: parsed.data.material ?? null,
          price_amount: parsed.data.price_amount ?? null,
          purchase_date: parsed.data.purchase_date ?? null,
          notes: parsed.data.notes ?? null,
        };
        const { error } = await supabase.from('items').update(row).eq('id', itemId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('items')
          .insert({ ...parsed.data, user_id: user.id })
          .select('id')
          .single();
        if (error) throw error;
        itemId = data.id;
      }

      if (photo && itemId) {
        const path = `${user.id}/${itemId}/${Date.now()}-${photo.name}`;
        const up = await supabase.storage.from('items-private').upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });
        if (up.error) throw new Error(`Saved, but the photo failed to upload: ${up.error.message}`);
        // One primary image per item (unique partial index) — demote the old one first.
        if (isEdit) {
          await supabase.from('item_images').update({ is_primary: false }).eq('item_id', itemId);
        }
        const { error: imgError } = await supabase.from('item_images').insert({
          item_id: itemId,
          storage_path: path,
          is_primary: true,
          sort_order: 0,
        });
        if (imgError) throw new Error(`Saved, but the photo wasn't linked: ${imgError.message}`);
      }

      router.push(`/library/${itemId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = existing ? `/library/${existing.id}` : '/library';

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border-strong bg-bg-muted text-center text-sm text-text-secondary transition-colors hover:bg-bg-surface">
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-6">Drop photo or click to upload</span>
          )}
          {preview ? (
            <span className="absolute bottom-3 rounded-full bg-bg-base/80 px-3 py-1 text-xs text-text-secondary">
              {photo ? 'New photo selected' : 'Click to replace photo'}
            </span>
          ) : null}
        </label>

        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === c
                      ? 'border-accent bg-accent text-text-onAccent'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          {isEdit ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong"
              >
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {category === 'artwork' ? null : (
          <Field
            label="Title (optional)"
            name="title"
            value={(values.title as string) ?? ''}
            onChange={(v) => update('title', v)}
          />
        )}
        {fields.map((f) => (
          <Field
            key={f.key}
            label={f.label + (f.required ? ' *' : '')}
            name={f.key}
            type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
            multiline={f.type === 'textarea'}
            options={f.options as readonly string[] | undefined}
            value={(values[f.key] as string) ?? ''}
            onChange={(v) => update(f.key, v)}
          />
        ))}
      </section>

      {error ? <p className="text-sm text-status-sold">{error}</p> : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save item'}
        </button>
        <Link href={backHref} className="text-sm text-text-secondary hover:text-text-primary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  multiline,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  options?: readonly string[];
}) {
  const cls =
    'w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong';
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      {options ? (
        <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          name={name}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}

// DB row → flat form values (top-level columns + details.* keyed by field key).
function flattenExisting(item: ExistingItem): FormState {
  const out: FormState = {};
  if (item.title) out.title = item.title;
  const details = item.details ?? {};
  for (const f of FIELDS_BY_CATEGORY[item.category]) {
    const raw = f.detailsKey
      ? details[f.detailsKey]
      : (item as unknown as Record<string, unknown>)[f.key];
    if (raw === undefined || raw === null || raw === '') continue;
    out[f.key] = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  }
  return out;
}

function buildPayload(
  category: Category,
  values: FormState,
  status: string,
  baseDetails: Record<string, unknown> | null,
) {
  const fields = FIELDS_BY_CATEGORY[category];
  const top: Record<string, unknown> = { category, status };
  // Keep detail keys the form doesn't own (e.g. last_worn_date, set by a DB
  // trigger); form-owned keys are rebuilt from the current values.
  const details: Record<string, unknown> = { ...(baseDetails ?? {}) };
  for (const f of fields) if (f.detailsKey) delete details[f.detailsKey];

  if (typeof values.title === 'string' && values.title) top.title = values.title;

  for (const f of fields) {
    const raw = values[f.key];
    if (raw === undefined || raw === '') continue;
    let v: unknown = raw;
    if (f.type === 'number' || f.type === 'currency') v = Number(raw);
    if (f.detailsKey) details[f.detailsKey] = v;
    else top[f.key] = v;
  }
  top.details = details;
  if (top.price_amount !== undefined) top.price_currency = top.price_currency ?? 'INR';
  return top;
}
