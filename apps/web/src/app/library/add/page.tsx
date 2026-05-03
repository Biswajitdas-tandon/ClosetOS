'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FIELDS_BY_CATEGORY,
  ItemSchema,
  type Category,
} from '@closetos/domain';
import { browserClient } from '@/lib/supabase';
import { SiteHeader } from '@/components/SiteHeader';

type FormState = Record<string, string | number | undefined>;

export default function AddItemPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('apparel');
  const [values, setValues] = useState<FormState>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
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

  async function tryAutoFill() {
    if (!photo) return;
    setAutofilling(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', photo);
      const res = await fetch('/api/items/auto-fill', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Auto-fill failed (${res.status})`);
      const json = (await res.json()) as Record<string, string | number | undefined>;
      if (json.category && (CATEGORIES as readonly string[]).includes(json.category as string)) {
        setCategory(json.category as Category);
      }
      setValues((v) => ({ ...v, ...json }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-fill unavailable');
    } finally {
      setAutofilling(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload(category, values);
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
      const { data, error } = await supabase
        .from('items')
        .insert({ ...parsed.data, user_id: user.id })
        .select('id')
        .single();
      if (error) throw error;

      if (photo && data) {
        const path = `${user.id}/${data.id}/${Date.now()}-${photo.name}`;
        const up = await supabase.storage.from('items-private').upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });
        if (!up.error) {
          await supabase.from('item_images').insert({
            item_id: data.id,
            storage_path: path,
            is_primary: true,
            sort_order: 0,
          });
        }
      }

      router.push(`/library/${data?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Add an item</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Drop a photo. AI fills the rest. You confirm and save.
            </p>
          </div>
          <Link href="/library" className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>

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
                <span className="px-6">
                  Drop photo or click to upload
                  <br />
                  <span className="text-xs text-text-muted">EXIF stripped automatically</span>
                </span>
              )}
            </label>

            <div className="flex flex-col justify-between">
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
              <button
                type="button"
                onClick={tryAutoFill}
                disabled={!photo || autofilling}
                className="mt-6 rounded-md border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-bg-muted disabled:opacity-50"
              >
                {autofilling ? 'Reading photo…' : '✨ Auto-fill from photo'}
              </button>
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
              {submitting ? 'Saving…' : 'Save item'}
            </button>
            <Link
              href="/library"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
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

function buildPayload(category: Category, values: FormState) {
  const fields = FIELDS_BY_CATEGORY[category];
  const top: Record<string, unknown> = { category };
  const details: Record<string, unknown> = {};

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
