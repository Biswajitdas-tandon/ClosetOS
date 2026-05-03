import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  resource_type: z.enum(['folder', 'item', 'outfit']),
  resource_id: z.string().uuid(),
  permission: z.enum(['view', 'edit']).default('view'),
  expires_in_days: z.number().int().positive().max(365).optional(),
});

export async function POST(req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'bad request' }, { status: 400 });
  }
  const { resource_type, resource_id, permission, expires_in_days } = parsed.data;

  // Verify the user owns the resource.
  const ownerCheck = await supabase
    .from(resource_type === 'folder' ? 'folders' : resource_type === 'item' ? 'items' : 'outfits')
    .select('id')
    .eq('id', resource_id)
    .maybeSingle();
  if (!ownerCheck.data) {
    return NextResponse.json({ error: 'resource not found or not yours' }, { status: 404 });
  }

  const share_token = randomBytes(18).toString('base64url'); // ~24 chars, URL-safe
  const expires_at = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('shared_access')
    .insert({
      resource_type,
      resource_id,
      owner_id: user.id,
      shared_with_id: null,
      share_token,
      permission,
      expires_at,
    })
    .select('share_token, expires_at, permission')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.headers.get('origin') ?? new URL(req.url).origin;
  return NextResponse.json({
    share_token: (data as { share_token: string }).share_token,
    url: `${origin}/share/${(data as { share_token: string }).share_token}`,
    expires_at: (data as { expires_at: string | null }).expires_at,
    permission: (data as { permission: string }).permission,
  });
}
