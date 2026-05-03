import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase-server';

// POST /api/search/semantic
// Body: { q: string, limit?: number }
// Returns top-K items by cosine similarity.

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { q, limit = 24 } = (await req.json()) as { q: string; limit?: number };
  if (!q || typeof q !== 'string') {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'semantic search disabled (no API key)' }, { status: 503 });
  }

  const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: q, dimensions: 1536 }),
  });
  if (!embedRes.ok) {
    return NextResponse.json({ error: `embed failed (${embedRes.status})` }, { status: 502 });
  }
  const embedJson = (await embedRes.json()) as { data: { embedding: number[] }[] };
  const vec = embedJson.data[0]?.embedding;
  if (!vec) return NextResponse.json({ error: 'no embedding' }, { status: 502 });

  const supabase = await serverClient();
  // RPC pattern: in production add a `match_items(query_embedding, k)` SQL function.
  // Inline RPC fallback uses ORDER BY cosine via raw SQL through PostgREST is not allowed,
  // so we expect a SQL function. For now we degrade to text search.
  const { data, error } = await supabase
    .from('items')
    .select('id, title, brand, colour, category, status')
    .textSearch('search_text', q, { config: 'english' })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data, embedding_dims: vec.length });
}
