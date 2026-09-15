'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase';

// Deletes the item row (cascades to item_images, item_tags, outfit_items,
// packing_list_items) and its files in the private bucket. RLS guarantees only
// the owner can do either.
export function DeleteItemButton({ itemId, title }: { itemId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const supabase = browserClient();
      const { data: images } = await supabase
        .from('item_images')
        .select('storage_path')
        .eq('item_id', itemId);
      const paths = (images ?? []).map((i) => i.storage_path);
      if (paths.length) {
        // Best effort: an orphaned file is harmless; a failed row delete is not.
        await supabase.storage.from('items-private').remove(paths);
      }
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;
      router.push('/library');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-text-muted underline-offset-4 hover:text-status-sold hover:underline"
      >
        Delete item
      </button>
    );
  }

  return (
    <div className="rounded-md border border-status-sold bg-bg-surface p-4 text-sm">
      <p className="font-medium">Delete “{title}”?</p>
      <p className="mt-1 text-text-secondary">
        Removes the item, its photo, and any outfit or packing list it&apos;s in. This can&apos;t be undone.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-md bg-status-sold px-4 py-2 text-sm font-medium text-text-onAccent disabled:opacity-60"
        >
          {busy ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Keep it
        </button>
      </div>
      {error ? <p className="mt-2 text-status-sold">{error}</p> : null}
    </div>
  );
}
