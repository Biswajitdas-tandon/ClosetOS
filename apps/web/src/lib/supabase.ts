// Client-safe Supabase helpers. No `next/headers` import here so this module
// can be imported from "use client" components without breaking the build.
import { createClient } from '@closetos/db';

export function browserClient() {
  return createClient();
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
