'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@closetos/domain';
import { browserClient } from '@/lib/supabase';
import { SiteHeader } from '@/components/SiteHeader';

type LibItem = {
  id: string;
  category: Category;
  title: string;
  brand: string | null;
  colour: string | null;
};

export default function NewOutfitPage() {
  // useSearchParams must be inside a Suspense boundary for Next.js 15 prerender.
  return (
    <Suspense fallback={<NewOutfitFallback />}>
      <NewOutfitForm />
    </Suspense>
  );
}

function NewOutfitFallback() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="h-8 w-40 animate-pulse rounded bg-bg-muted" />
      </main>
    </div>
  );
}

function NewOutfitForm() {
  const router = useRouter();
  const params = useSearchParams();
  const dateParam = params.get('date') ?? '';

  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [eventDate, setEventDate] = useState(dateParam);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LibItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data } = await supabase
        .from('items')
        .select('id, category, title, brand, colour')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setItems(((data ?? []) as unknown as LibItem[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const grouped = useMemo(() => {
    const out: Record<Category, LibItem[]> = {
      apparel: [], accessory: [], jewelry: [], silver: [], artwork: [],
    };
    for (const it of items) out[it.category].push(it);
    return out;
  }, [items]);

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      if (picked.size === 0) throw new Error('Pick at least one item');
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: outfit, error: oErr } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: name || null,
          occasion: occasion || null,
          event_date: eventDate || null,
          notes: notes || null,
        })
        .select('id')
        .single();
      if (oErr) throw oErr;
      const outfitId = (outfit as { id: string }).id;

      const rows = Array.from(picked).map((item_id) => ({
        outfit_id: outfitId, item_id,
      }));
      const { error: iErr } = await supabase.from('outfit_items').insert(rows);
      if (iErr) throw iErr;

      // If a date was given, also log a calendar event so last_worn_date trigger fires
      if (eventDate) {
        await supabase.from('calendar_events').insert({
          user_id: user.id,
          event_date: eventDate,
          outfit_id: outfitId,
          title: name || null,
        });
      }

      router.push(`/outfits/${outfitId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Compose outfit</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Pick items below. Add a date to log it as worn.
            </p>
          </div>
          <Link href="/outfits" className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <aside className="space-y-4 md:sticky md:top-24 md:self-start">
            <Field label="Name" value={name} onChange={setName} placeholder="e.g. Diwali brunch" />
            <Field label="Occasion" value={occasion} onChange={setOccasion} placeholder="evening" />
            <Field label="Date worn (optional)" value={eventDate} onChange={setEventDate} type="date" />
            <Field label="Notes" value={notes} onChange={setNotes} multiline />

            <div className="rounded-md border border-border-subtle bg-bg-surface p-4 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                Selected
              </p>
              {picked.size === 0 ? (
                <p className="text-text-muted">No items picked yet.</p>
              ) : (
                <p>{picked.size} item{picked.size === 1 ? '' : 's'}</p>
              )}
            </div>

            {error ? <p className="text-sm text-status-sold">{error}</p> : null}

            <button
              type="button"
              onClick={save}
              disabled={submitting || picked.size === 0}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save outfit'}
            </button>
          </aside>

          <section className="md:col-span-2">
            {items.length === 0 ? (
              <p className="text-sm text-text-muted">No items in your library yet.</p>
            ) : (
              CATEGORIES.filter((c) => grouped[c].length > 0).map((c) => (
                <div key={c} className="mb-8">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    {CATEGORY_LABEL[c]} · {grouped[c].length}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {grouped[c].map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => toggle(it.id)}
                        aria-pressed={picked.has(it.id)}
                        className={`flex flex-col rounded-md border p-3 text-left transition-all ${
                          picked.has(it.id)
                            ? 'border-accent bg-accent/5 ring-2 ring-accent'
                            : 'border-border-subtle bg-bg-surface hover:border-border-strong'
                        }`}
                      >
                        <span className="truncate text-sm font-medium">{it.title}</span>
                        <span className="truncate text-xs text-text-muted">
                          {[it.brand, it.colour].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  const cls =
    'w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong';
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  );
}
