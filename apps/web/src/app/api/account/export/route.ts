import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { serverClient } from '@/lib/supabase-server';
import { createAdminClient } from '@closetos/db';

// GET /api/account/export
// Returns a ZIP containing:
//   • items.json, folders.json, tags.json, item_images.json
//   • outfits.json, calendar_events.json
//   • wishlist.json, packing_lists.json
//   • shared_access.json
//   • media/<item_id>/<filename>  — original images from items-private
//
// GDPR/DPDP compliant: lets the user take their data with them.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TABLES = [
  'profiles',
  'folders',
  'tags',
  'items',
  'item_tags',
  'item_images',
  'outfits',
  'outfit_items',
  'calendar_events',
  'shared_access',
  'wishlist',
  'packing_lists',
  'packing_list_items',
] as const;

export async function GET() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const zip = new JSZip();
  zip.file('README.txt', readme(user.email ?? ''));

  // 1. Dump every table the user can see (RLS already scopes to them)
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      zip.file(`${t}.error.txt`, error.message);
    } else {
      zip.file(`${t}.json`, JSON.stringify(data ?? [], null, 2));
    }
  }

  // 2. Bundle the user's images (use admin client so we can list+download in bulk)
  const admin = createAdminClient();
  const media = zip.folder('media')!;

  const { data: images } = await supabase
    .from('item_images')
    .select('item_id, storage_path');

  for (const img of (images ?? []) as { item_id: string; storage_path: string }[]) {
    const dl = await admin.storage.from('items-private').download(img.storage_path);
    if (dl.error || !dl.data) continue;
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const filename = img.storage_path.split('/').pop() ?? 'image.bin';
    media.file(`${img.item_id}/${filename}`, buf);
  }

  const blob = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(blob as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="closetos-export-${stamp}.zip"`,
      'cache-control': 'no-store',
    },
  });
}

function readme(email: string) {
  return `ClosetOS — data export
Account: ${email}
Generated: ${new Date().toISOString()}

This archive contains everything ClosetOS holds on your account:
  • One JSON file per table (items, outfits, calendar_events, ...).
  • A media/ folder with the original images you uploaded, organised
    by item id.

You can re-import this data into another ClosetOS instance, or use it
to build your own tools — the schema is documented at
https://github.com/ <- link your fork once published.

If you also wanted to *delete* your account, use Account Settings →
Delete account. That removes everything from our servers permanently.
`;
}
