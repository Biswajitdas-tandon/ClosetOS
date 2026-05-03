'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase';
import { SiteHeader } from '@/components/SiteHeader';

const TRIP_TYPES = ['leisure', 'beach', 'work', 'wedding', 'travel', 'evening', 'formal'];

type Suggestion = {
  weather_summary: { place: string; summary: string; high_c?: number; low_c?: number; precip_pct?: number };
  matched_tags: string[];
  suggested_item_ids: string[];
};

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState('leisure');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getSuggestions() {
    setLoadingSuggest(true);
    setError(null);
    try {
      if (!destination || !start || !end) throw new Error('Fill destination + dates first');
      const res = await fetch('/api/packing/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ destination, start_date: start, end_date: end, trip_type: type }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      setSuggestion(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get suggestions');
    } finally {
      setLoadingSuggest(false);
    }
  }

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Trip name required');
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data, error: tErr } = await supabase
        .from('packing_lists')
        .insert({
          user_id: user.id,
          trip_name: name.trim(),
          destination: destination || null,
          start_date: start || null,
          end_date: end || null,
          trip_type: type || null,
          weather_summary: suggestion?.weather_summary ?? null,
        })
        .select('id')
        .single();
      if (tErr) throw tErr;
      const tripId = (data as { id: string }).id;

      if (suggestion?.suggested_item_ids?.length) {
        const rows = suggestion.suggested_item_ids.map((item_id) => ({
          list_id: tripId, item_id, packed: false,
        }));
        await supabase.from('packing_list_items').insert(rows);
      }

      router.push(`/packing/${tripId}`);
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
          <h1 className="font-display text-3xl">Plan a trip</h1>
          <Link href="/packing" className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>

        <div className="space-y-4">
          <Field label="Trip name *" value={name} onChange={setName} placeholder="e.g. Goa, Jan 2026" />
          <Field label="Destination" value={destination} onChange={setDestination} placeholder="city or place" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" type="date" value={start} onChange={setStart} />
            <Field label="End date" type="date" value={end} onChange={setEnd} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Trip type</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === t
                      ? 'border-accent bg-accent text-text-onAccent'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={getSuggestions}
            disabled={loadingSuggest || !destination || !start || !end}
            className="w-full rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium transition-colors hover:bg-bg-muted disabled:opacity-50"
          >
            {loadingSuggest ? 'Checking weather…' : '🌤️  Get suggestions from your library'}
          </button>

          {suggestion ? (
            <div className="rounded-md border border-border-subtle bg-bg-surface p-4">
              <p className="text-sm font-medium">{suggestion.weather_summary.place}</p>
              <p className="mt-1 text-xs text-text-secondary">{suggestion.weather_summary.summary}</p>
              <p className="mt-3 text-xs text-text-muted">
                Matched tags: {suggestion.matched_tags.join(', ') || 'none'}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Picked {suggestion.suggested_item_ids.length} item{suggestion.suggested_item_ids.length === 1 ? '' : 's'} from your library
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-status-sold">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={submitting}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-text-onAccent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save trip'}
            </button>
            <Link href="/packing" className="text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-strong"
      />
    </label>
  );
}
