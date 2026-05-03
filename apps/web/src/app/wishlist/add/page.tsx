'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABEL } from '@closetos/domain';
import { browserClient } from '@/lib/supabase';
import { SiteHeader } from '@/components/SiteHeader';

export default function AddToWishlistPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error('Title required');
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { error } = await supabase.from('wishlist').insert({
        user_id: user.id,
        title: title.trim(),
        image_url: imageUrl.trim() || null,
        source_url: sourceUrl.trim() || null,
        category: category || null,
        target_price: targetPrice ? Number(targetPrice) : null,
        current_price: currentPrice ? Number(currentPrice) : null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      router.push('/wishlist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl">Add to wishlist</h1>
          <Link href="/wishlist" className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>

        <form onSubmit={save} className="space-y-4">
          <Field label="Title *" value={title} onChange={setTitle} placeholder="e.g. Loro Piana cashmere coat" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
            <Field label="Source URL" value={sourceUrl} onChange={setSourceUrl} placeholder="https://…" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={[['', '—'], ...CATEGORIES.map((c) => [c, CATEGORY_LABEL[c]] as const)]}
            />
            <Field label="Current price" type="number" value={currentPrice} onChange={setCurrentPrice} />
            <Field label="Target price" type="number" value={targetPrice} onChange={setTargetPrice} />
          </div>

          <Field label="Notes" value={notes} onChange={setNotes} multiline />

          {imageUrl ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-secondary">Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="preview"
                className="max-h-48 rounded-md border border-border-subtle bg-bg-muted"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-status-sold">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <Link href="/wishlist" className="text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </Link>
          </div>
        </form>
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
    'w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-strong';
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      {multiline ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-strong"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
