// Permissive placeholder. Replace by running:  pnpm db:types
// (after `supabase link` or `supabase start`). Once generated, every query
// will be statically typed against the live schema.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
