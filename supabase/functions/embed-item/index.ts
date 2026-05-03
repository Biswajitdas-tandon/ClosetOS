// supabase/functions/embed-item — writes pgvector embedding for an item.
// Invoke from a DB trigger or post-save webhook with `{ item_id }`.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Payload = { item_id: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const { item_id } = (await req.json()) as Payload;
  if (!item_id) return new Response('item_id required', { status: 400 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return new Response('OPENAI_API_KEY not set', { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: item, error } = await supabase
    .from('items')
    .select('title, brand, colour, material, notes, category, details')
    .eq('id', item_id)
    .single();
  if (error || !item) return new Response(`not found: ${error?.message ?? ''}`, { status: 404 });

  const text = [
    item.category,
    item.title,
    item.brand,
    item.colour,
    item.material,
    item.notes,
    typeof item.details === 'object' ? JSON.stringify(item.details) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 1536 }),
  });
  if (!res.ok) return new Response(`embed failed: ${res.status}`, { status: 502 });

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const vec = json.data[0]?.embedding;
  if (!vec) return new Response('no embedding returned', { status: 502 });

  const { error: updErr } = await supabase
    .from('items')
    .update({ embedding: vec as unknown as string })
    .eq('id', item_id);
  if (updErr) return new Response(updErr.message, { status: 500 });

  return Response.json({ ok: true, dims: vec.length });
});
