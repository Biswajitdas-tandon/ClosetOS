import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const explicitNext = url.searchParams.get('next');

  let target = explicitNext ?? '/library';

  if (code) {
    const supabase = await serverClient();
    await supabase.auth.exchangeCodeForSession(code);

    // First-run heuristic: if a freshly-signed-in user has no items yet,
    // send them through onboarding instead of the empty Library.
    if (!explicitNext) {
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      if ((count ?? 0) === 0) target = '/onboarding';
    }
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
