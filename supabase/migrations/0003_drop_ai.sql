-- 0003_drop_ai.sql — reverse the AI integration introduced in 0001 + 0002.
-- Client opted out of AI; intake and search are fully manual / full-text only.

-- 1. Drop the cosine-similarity RPC (introduced in 0002_match_items_rpc.sql).
drop function if exists public.match_items(vector, int);

-- 2. Drop the ivfflat index on the embedding column.
drop index if exists public.items_embedding_idx;

-- 3. Drop the embedding column itself.
alter table public.items drop column if exists embedding;

-- 4. Drop the pgvector extension. No other consumers in this schema.
drop extension if exists "vector";
