# ClosetOS — Start here (developer setup)

You have the complete project in this folder. No GitHub, Vercel or Supabase access is needed to run it or work on it.

## 1. Install once

- **Node.js 20 or newer** — https://nodejs.org (LTS). Check: `node -v`
- **pnpm** — after Node is installed: `npm install -g pnpm`

## 2. Run the app locally

Open a terminal in this folder (PowerShell: `npx.cmd` if `npx` is blocked):

```bash
pnpm install
pnpm --filter @closetos/web dev
```

Then open http://localhost:3000. Stop with `Ctrl+C`.

`apps/web/.env.local` is already filled in with the project's public keys, so the local app talks to the **same live database** as https://closetos-iota.vercel.app. Anything you add locally is real data — use your own login (ask Ishaan/Biswajit for one) and don't touch other people's items.

## 3. What to read

| File | What it is |
|---|---|
| `docs/HANDOVER.md` | How the whole thing is set up, what's open, day-to-day operations |
| `docs/ClosetOS-User-Guide.pdf` | What the app does, from the user's side |
| `README.md` | Stack, folder layout, all routes, database tables |
| `LAUNCH.md` | Go-live checklist and every known limitation with its fix |

## 4. Where the code is

```
apps/web/src/app/        pages — one folder per URL (library/, outfits/, packing/ …)
apps/web/src/components/ shared UI (ItemForm, ShareModal, SiteHeader …)
apps/web/src/lib/        Supabase clients, image signing, date helpers
packages/domain/         categories, per-category fields, validation (Zod)
packages/ui/             design tokens + primitives shared with mobile
supabase/migrations/     database schema (already applied to the live DB)
apps/mobile/             Expo app — exists, never shipped, lowest priority
```

Check types before handing work back: `pnpm --filter @closetos/web typecheck`

## 5. Handing work back

Deployment goes through GitHub → Vercel, which only Biswajit can push to. When you're done (or at a good checkpoint):

1. Delete `node_modules` folders (or just exclude them).
2. Zip this whole folder and send it back.
3. Say which files you changed and what you tested.

This copy was taken from commit `__BASE_COMMIT__` on `main` — that's what your changes will be diffed against, so don't rename or move existing files without saying so.

## 6. Don't

- Don't commit or share `apps/web/.env.local` outside the team (public keys, but still ours).
- Don't run anything against the live database from scripts — use the app.
- Don't change `supabase/migrations/` files that already exist; add a new numbered file for schema changes.
