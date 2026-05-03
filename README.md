# ClosetOS

Personal inventory + planning system for **apparel · accessories · jewelry · silver · artwork**.
Image-first, AI-assisted intake, natural-language search, calendar/outfits, packing lists, and shareable folders.

> **Status:** Phase 0–5 scaffold (Foundation + Inventory MVP web + AI hooks + Expo mobile + Calendar/Outfits + Sharing + dark mode).
> See [build-a-modern-full-stack-buzzing-lemur.md](../../.claude/plans/build-a-modern-full-stack-buzzing-lemur.md) for the full roadmap.

---

## Stack

- **Web:** Next.js 15 (App Router, Turbopack, RSC) · Tailwind CSS · shadcn-style primitives in `@closetos/ui`
- **Mobile:** Expo SDK 52 + Expo Router · React Native 0.76 (New Architecture) · expo-camera, expo-image-picker, expo-image
- **Backend:** Supabase (Postgres + RLS + Auth + Storage) with `pgvector`
- **AI:** OpenAI Vision (auto-fill) + `text-embedding-3-small` (semantic search)
- **Domain:** Zod schemas in `@closetos/domain` shared across web/edge/mobile
- **Monorepo:** pnpm workspaces + Turborepo

```
ClosetOS/
├── apps/
│   ├── web/                     # Next.js 15
│   └── mobile/                  # Expo SDK 52 + Expo Router
├── packages/
│   ├── domain/                  # Zod schemas + per-category field metadata
│   ├── db/                      # Supabase client (browser + server) + DB types
│   └── ui/                      # design tokens + primitives (ItemCard, FilterChip, EmptyState)
├── supabase/
│   ├── migrations/              # 0001_init.sql, 0002_match_items_rpc.sql
│   └── functions/               # embed-item, process-image (Deno edge functions)
└── turbo.json · pnpm-workspace.yaml · .npmrc (node-linker=hoisted, required for RN/Expo)
```

---

## Quick start

```bash
cd ClosetOS
pnpm install
pnpm --filter @closetos/web dev    # http://localhost:3000
```

The home page works in **demo mode** without any Supabase config — useful while exploring the UI.

To enable real persistence + auth + AI:

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. Copy `.env.example` → `apps/web/.env.local` and fill in the values from
   *Project settings → API*:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   OPENAI_API_KEY=sk-...
   ```
3. **Run the migrations** (one-time):
   - Hosted: open the SQL editor in the Supabase dashboard and paste
     `supabase/migrations/0001_init.sql`, then `0002_match_items_rpc.sql`.
   - Local: `pnpm db:start && pnpm db:reset` (requires the Supabase CLI).
4. Restart `pnpm --filter @closetos/web dev` and sign in via the magic link
   on `/login`.

---

## Mobile (Expo)

```bash
# 1. Configure
cp apps/mobile/.env.example apps/mobile/.env.local   # already populated for this project
# 2. Run
pnpm --filter @closetos/mobile start
# Then press i (iOS Simulator), a (Android), or scan the QR with Expo Go.
```

**Why `.npmrc` sets `node-linker=hoisted`:** Expo + React Native + Metro can't follow pnpm's symlinked layout; deps must be hoisted into a single root `node_modules/`. This file is present at the workspace root.

**Mobile screens** (under `apps/mobile/app/`):

| Route                    | Native screen                                            |
|--------------------------|----------------------------------------------------------|
| `/` (`index.tsx`)        | Library: 2-col `FlatList`, category chips, search, sign-in CTA |
| `/library/[id].tsx`      | Item detail with image and structured fields             |
| `/library/add.tsx`       | Capture-from-camera (or photo library) + dynamic form    |
| `/login.tsx`             | Magic-link auth via deep link `closetos://auth/callback` |

The mobile app **shares**:
- `@closetos/domain` — same Zod schemas + per-category field metadata as web
- `@closetos/ui/tokens` — same colour/typography/spacing tokens (RN consumes them via `StyleSheet`)

It does **not** share the web `@closetos/ui` components (different platform primitives) — instead, native equivalents live in `apps/mobile/components/`.

For Supabase magic-link auth on mobile, whitelist the deep link in your project:
→ Authentication → URL Configuration → add `closetos://auth/callback` to **Redirect URLs**.

---

## Routes (web)

| Path                  | What it does                                                  |
|-----------------------|---------------------------------------------------------------|
| `/`                   | Marketing landing + demo grid                                 |
| `/login`              | Email magic-link sign-in                                      |
| `/auth/callback`      | OAuth/PKCE callback that exchanges code for session           |
| `/library`            | Filterable, searchable item grid (category chips, tsvector)   |
| `/library/add`        | Multi-step add: photo → AI auto-fill → confirm → save         |
| `/library/[id]`       | Detail view with structured fields + last-worn + cost-per-wear |
| `/outfits`            | Saved outfits grid                                             |
| `/outfits/new`        | Outfit composer (multi-pick items grouped by category, optional date logs to calendar) |
| `/outfits/[id]`       | Outfit detail (linked items, occasion, date)                   |
| `/calendar`           | Month grid with outfit pills per date, prev/next navigation    |
| `/calendar/[date]`    | Day view: log/list outfits for that date                       |
| `/share/[token]`      | Public read-only viewer for a shared item or outfit            |
| `/api/share/link`     | POST: create a share link with `view`/`edit` permission + optional expiry |
| `/api/share/[token]/revoke` | DELETE: revoke an existing share link                    |
| `/api/items/auto-fill`| Vision call → JSON of suggested fields                        |
| `/api/search/semantic`| Embedding-based search (depends on `match_items` RPC)         |

---

## Database

Defined in `supabase/migrations/0001_init.sql`. Key tables:

- `items` — single discriminated table for all 5 categories. Common fields up
  top, category-specific fields under `details jsonb`, validated by Zod
  (`packages/domain/src/items.ts`). Has a `tsvector` `search_text` and a
  `vector(1536)` `embedding`.
- `folders` (nestable), `tags`, `item_tags`, `item_images`
- `outfits`, `outfit_items`, `calendar_events` — with a trigger that updates
  `items.details.last_worn_date` whenever a calendar event references an outfit.
- `shared_access`, `activity_logs`, `wishlist`, `packing_lists`, `packing_list_items`

RLS is enabled on every table. Default policy:
`auth.uid() = user_id` for owner tables; ownership is derived through the parent
row for join tables.

---

## Edge functions

```bash
supabase functions deploy embed-item process-image
supabase secrets set OPENAI_API_KEY=...
```

- **`embed-item`** — given `{item_id}`, builds a string from the item's text
  fields and stores a 1536-dim embedding on the row.
- **`process-image`** — given `{object_path}`, downloads the original from
  `items-private`, strips EXIF (incl. GPS), produces `thumb` (256), `medium` (1024),
  and `large` (2048) WebP variants alongside it.

---

## Verifying changes

The plan file's verification section is the source of truth. Quick sanity checks:

```bash
# Type-check everything
pnpm typecheck

# Boot the web app (demo mode)
pnpm --filter @closetos/web dev

# Boot the local DB (requires Supabase CLI)
pnpm db:start && pnpm db:reset

# Regenerate DB types after schema changes
pnpm db:types
```

For RLS, log in as user A in one browser and user B in another, then confirm
neither can read the other's `items` rows from the SQL editor running as their
JWT.

---

## Theming

- Light + dark themes via CSS variables ([apps/web/src/app/globals.css](apps/web/src/app/globals.css)).
- Tailwind utility classes (`bg-bg-base`, `text-text-primary`, etc.) resolve to vars and flip on `:root[data-theme="dark"]`.
- [`<ThemeToggle/>`](apps/web/src/components/ThemeToggle.tsx) cycles `light → dark → system`. Preference persists in `localStorage` and a no-FOUC bootstrap script in [layout.tsx](apps/web/src/app/layout.tsx) sets the theme before paint.

---

## What's next (per the plan)

- **Phase 6 — wishlist & packing list flows.**
- **Phase 7 — account export/delete + launch (TestFlight + production domain).**
