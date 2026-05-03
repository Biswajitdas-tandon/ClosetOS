// Server-component / Route Handler Supabase client.
// Reads cookies via next/headers so auth state is shared with the browser.
import { createServerClient } from '@supabase/ssr';
import type { Database } from './types.generated';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
};

export function createServerSupabase(cookies: CookieStore) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          if (!cookies.set) return;
          for (const c of toSet) cookies.set(c.name, c.value, c.options);
        },
      },
    },
  );
}

// Service-role client for privileged server-only operations (edge functions, admin tasks).
// NEVER import this from client components.
import { createClient as createAdminBase } from '@supabase/supabase-js';
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createAdminBase<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
