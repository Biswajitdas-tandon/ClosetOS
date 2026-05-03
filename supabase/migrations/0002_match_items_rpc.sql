-- Cosine-similarity RPC used by /api/search/semantic
create or replace function public.match_items(
  query_embedding vector(1536),
  match_count int default 24
)
returns table (
  id uuid,
  title text,
  brand text,
  colour text,
  category text,
  status text,
  similarity float
)
language sql stable as $$
  select
    i.id, i.title, i.brand, i.colour, i.category, i.status,
    1 - (i.embedding <=> query_embedding) as similarity
  from public.items i
  where i.user_id = auth.uid()
    and i.embedding is not null
  order by i.embedding <=> query_embedding
  limit match_count;
$$;
