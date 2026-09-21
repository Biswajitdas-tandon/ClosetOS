# ClosetOS — Handover

Everything about this project in one place. Code, database, hosting, documents, and what is still open.
Last updated 21 Sep 2026.

## What it is

Personal inventory + planning web app for apparel, accessories, jewellery, silver and artwork.
Built by IT Squared. Currently a **client POC** at the preview URL below — no custom domain, no paid services.

## Where everything lives

| Thing | Where |
|---|---|
| **This folder** | `Desktop/ClosetOS` — the git repo; code, database migrations, docs, scripts |
| Source of truth | https://github.com/Biswajitdas-tandon/ClosetOS (branch `main`) — **public repo** |
| Live app | https://closetos-iota.vercel.app |
| Hosting (web) | Vercel project `closetos`, team *biswajitdas-tandon's projects*. Every push to `main` deploys. |
| Database, auth, photo storage | Supabase project `closetos`, ref `ncowtwpxvefhbljwfsxo`, Mumbai (ap-south-1), free tier — https://supabase.com/dashboard/project/ncowtwpxvefhbljwfsxo |
| User guide | `docs/ClosetOS-User-Guide.pdf` (source: `docs/user-guide/guide.html`; rebuild with `scripts/build-guide-pdf.sh`) |
| Go-live checklist | `LAUNCH.md` (what's done, what's open, exact steps) |
| Developer docs | `README.md` (stack, routes, local setup) |

Secrets (Supabase service-role key, etc.) are **not** in this folder. They live only in Vercel → closetos → Settings → Environment Variables. `apps/web/.env.local` holds only the public URL + anon key and is git-ignored.

## Accounts

All three services are on Biswajit's logins: GitHub `Biswajitdas-tandon`, Vercel, Supabase.
If the project moves to the client, transfer the GitHub repo and the Vercel + Supabase projects from those dashboards; the code needs no change.

## Day-to-day operations

**Create a login for someone** (there is no self-signup):
Supabase dashboard → Authentication → Users → *Add user → Create new user* → email + password → tick *Auto Confirm User* → Create.
Send them https://closetos-iota.vercel.app and the email; send the password separately.

**Reset a password:** same page → the user → set a new password directly. (The emailed reset link is unreliable — see *Email* below.)

**See or export data:** Supabase dashboard → Table Editor. Each user can also download everything they own from *Account → Download export (.zip)* inside the app.

**Change the code:** edit, `git push` to `main`, Vercel deploys in ~1 min. Database changes go in `supabase/migrations/` (the GitHub Action that applies them needs fresh secrets — see LAUNCH.md).

## Known limits of the POC (all in LAUNCH.md with fix steps)

- **Email.** Sign-in and reset emails go through Supabase's shared sender: capped at a few per hour and blocked by some corporate mail (tandongroup.com). That is why logins are password-based. Fix = custom SMTP (Resend) + a domain.
- **Magic links** only work in the browser that requested them until custom email templates are enabled (needs the SMTP above).
- **Google sign-in** is hidden (`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` unset) — needs a Google OAuth client.
- **Share links** can be created but not revoked from the UI (the API exists).
- **Packing suggestions** can't be edited before saving.
- **Mobile app** (`apps/mobile`, Expo) exists but was never built or shipped; it has no auth callback handler.
- **Repo is public.** Fine for a POC; make it private before client-specific work lands in it.

## History

- 3–4 May 2026 — built (Phases 0–7), first Vercel deploy. AI features removed on purpose.
- May → Sep 2026 — the original Supabase project was deleted; the site ran with a dead backend.
- 15 Sep 2026 — new Supabase project provisioned; schema, storage, edge function, env vars, auth URLs, service-role key all re-done. Sign-in switched to email + password. Photos made to display; item edit + delete added. User guide written.
- 21 Sep 2026 — everything gathered into this folder; handover written.
