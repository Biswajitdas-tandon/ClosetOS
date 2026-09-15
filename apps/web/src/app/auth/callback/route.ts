import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { serverClient } from '@/lib/supabase-server';

// Auth callback. Two ways in:
//
//  1. token_hash + type  — email links (magic link / confirm signup). The email
//     templates in supabase/templates/ build this URL. No PKCE verifier needed,
//     so the link works on whichever device opens it (phone, other browser…).
//  2. code               — PKCE exchange, used by OAuth (Google). Only completes
//     in the browser that started the flow, which is fine for OAuth redirects.
//
// Supabase also redirects here with ?error=…&error_description=… when a link is
// invalid or expired; forward that to /login so the user sees why.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const explicitNext = url.searchParams.get('next');
  const upstreamError =
    url.searchParams.get('error_description') ?? url.searchParams.get('error');

  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url.origin));

  if (upstreamError) return fail(upstreamError);

  const supabase = await serverClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
  } else {
    return fail('Sign-in link is missing its token. Request a new one.');
  }

  let target = explicitNext ?? '/library';

  // First-run heuristic: if a freshly-signed-in user has no items yet,
  // send them through onboarding instead of the empty Library.
  if (!explicitNext) {
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true });
    if ((count ?? 0) === 0) target = '/onboarding';
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
