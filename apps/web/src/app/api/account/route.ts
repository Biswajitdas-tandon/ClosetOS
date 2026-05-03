import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase-server';
import { createAdminClient } from '@closetos/db';

// DELETE /api/account
// Permanently deletes the signed-in user:
//   1. Recursively delete every storage object under items-private/<user_id>/
//   2. Delete the auth.users row → cascades to profiles + every user_id-scoped table
//
// The DB schema's `on delete cascade` does the heavy lifting on the table side.
// Body is intentionally validated server-side: client must send `{ confirm: "DELETE" }`.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'must send {"confirm":"DELETE"}' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Purge storage. Storage buckets aren't covered by the DB cascade.
  await purgeStorage(admin, 'items-private', user.id);
  await purgeStorage(admin, 'items-public', user.id);

  // 2. Delete the auth user. This cascades through every public table
  //    because every user_id column references auth.users(id) on delete cascade.
  const del = await admin.auth.admin.deleteUser(user.id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  // Sign the local session out (cookie clears server-side)
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function purgeStorage(admin: AdminClient, bucket: string, userId: string) {
  // Storage doesn't recurse on remove(), so list everything under the user prefix
  // and pass the full paths to remove() in batches.
  const stack = [userId];
  const toDelete: string[] = [];
  while (stack.length) {
    const prefix = stack.pop()!;
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) continue;
    for (const entry of data) {
      const full = `${prefix}/${entry.name}`;
      // Folders show up with id === null per Supabase Storage convention
      if (entry.id == null) stack.push(full);
      else toDelete.push(full);
    }
  }
  // Remove in batches of 100 to stay polite.
  while (toDelete.length) {
    const batch = toDelete.splice(0, 100);
    await admin.storage.from(bucket).remove(batch);
  }
}
