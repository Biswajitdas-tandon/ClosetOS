import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Item photos live in the private `items-private` bucket, so the browser can't
// load them by path. Server components sign URLs (1h) and pass them down.
const BUCKET = 'items-private';
const TTL_SECONDS = 60 * 60;

export type ImageRow = { storage_path: string; is_primary: boolean };

// Any client will do: the user-session client (RLS limits it to the owner's
// files) or the admin client (public share viewer).
type StorageClient = Pick<SupabaseClient, 'storage'>;

export function primaryImagePath(images: ImageRow[] | null | undefined): string | undefined {
  if (!images?.length) return undefined;
  return (images.find((i) => i.is_primary) ?? images[0])?.storage_path;
}

/** storage_path → signed URL. Paths that fail to sign are simply absent. */
export async function signImagePaths(
  supabase: StorageClient,
  paths: (string | undefined)[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!unique.length) return out;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, TTL_SECONDS);
  if (error || !data) return out;
  for (const row of data) {
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  }
  return out;
}

export async function signImagePath(
  supabase: StorageClient,
  path: string | undefined,
): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}
