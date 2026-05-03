'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase';
import type { Category } from '@closetos/domain';

type Entry = { id: string; title: string; brand: string | null; colour: string | null; packed: boolean };

export function TripChecklist({
  tripId,
  grouped,
  categories,
  categoryLabel,
}: {
  tripId: string;
  grouped: Record<Category, Entry[]>;
  categories: readonly Category[];
  categoryLabel: Record<Category, string>;
}) {
  const [state, setState] = useState(grouped);
  const [_, startTransition] = useTransition();

  const total = useMemo(
    () => categories.reduce((n, c) => n + state[c].length, 0),
    [state, categories],
  );
  const packed = useMemo(
    () => categories.reduce((n, c) => n + state[c].filter((e) => e.packed).length, 0),
    [state, categories],
  );

  async function togglePacked(category: Category, itemId: string, next: boolean) {
    setState((s) => ({
      ...s,
      [category]: s[category].map((e) => (e.id === itemId ? { ...e, packed: next } : e)),
    }));
    startTransition(async () => {
      const supabase = browserClient();
      await supabase
        .from('packing_list_items')
        .update({ packed: next })
        .eq('list_id', tripId)
        .eq('item_id', itemId);
    });
  }

  if (total === 0) {
    return (
      <div className="mt-10 rounded-md border border-dashed border-border-subtle bg-bg-surface p-8 text-center">
        <p className="text-text-secondary">No suggestions yet — try adding items to your library tagged for this trip type.</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-6 flex items-center justify-between text-sm">
        <p className="text-text-secondary">
          <strong className="text-text-primary">{packed}</strong> / {total} packed
        </p>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-bg-muted">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total ? (packed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {categories.map((c) => {
        const list = state[c];
        if (list.length === 0) return null;
        return (
          <section key={c} className="mb-8">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
              {categoryLabel[c]} · {list.length}
            </h3>
            <div className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-bg-surface">
              {list.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={e.packed}
                    onChange={(ev) => togglePacked(c, e.id, ev.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${e.packed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {e.title}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {[e.brand, e.colour].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Link
                    href={`/library/${e.id}`}
                    className="text-xs text-text-muted hover:text-text-primary"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    View →
                  </Link>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
