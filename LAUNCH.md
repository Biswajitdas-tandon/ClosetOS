# ClosetOS — Launch Checklist

End-to-end checklist for shipping the web app to a custom domain and the
mobile app to TestFlight + Google Play internal testing.

---

## Production backend (15 Sep 2026)

Supabase project **`closetos`** — ref `ncowtwpxvefhbljwfsxo`, region ap-south-1 (Mumbai), free tier.
Dashboard: https://supabase.com/dashboard/project/ncowtwpxvefhbljwfsxo

## ✅ Pre-flight (do once)

- [x] **DB migrations applied** — all three migrations are applied and recorded on the production project (versions `20260915063327`, `…342`, `…354`; the files in `supabase/migrations/` carry the same versions so `supabase db push` is a no-op). `0003` reverses the AI bits — drops the `match_items` RPC, the embedding column, the ivfflat index, and the `vector` extension.
- [x] **Storage buckets exist**: `items-private` (private) and `items-public` (public) — created by the migration, verified.
- [x] **RLS enabled** on all 14 tables (verified). Still to do: the two-user test below.
- [x] **Edge function `process-image`** deployed (v1, JWT verification on).
- [x] **Vercel env (Production)**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` point at the new project.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` in Vercel** — needed by `/share/[token]`, `/api/account/export`, `DELETE /api/account`. Not set yet (secret; must be added by a human). Either:
  - Dashboard → Project Settings → API → copy `service_role` → Vercel → closetos → Settings → Environment Variables → add for Production → Redeploy; **or**
  - from a terminal (never prints the key):
    ```bash
    npx supabase@latest login
    npx supabase@latest projects api-keys --project-ref ncowtwpxvefhbljwfsxo -o json \
      | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.parse(d).find(k=>k.name==='service_role').api_key))" \
      | npx vercel@latest env add SUPABASE_SERVICE_ROLE_KEY production --type secret --yes
    npx vercel@latest redeploy closetos-iota.vercel.app
    ```
- [ ] **Auth Site URL + redirect URLs** — set by the `Deploy Supabase` GitHub Action (Management API PATCH, values in the workflow's `env`). Confirm in Dashboard → Auth → URL Configuration: Site URL = `https://closetos-iota.vercel.app`, redirects include `/auth/callback` on prod + localhost, and `closetos://auth/callback`. If the Action is red, set them by hand.
- [ ] **GitHub secret `SUPABASE_DB_PASSWORD`** is the *old* project's password → the `Apply migrations` step fails until it's replaced. Reset the DB password in Dashboard → Project Settings → Database, then `gh secret set SUPABASE_DB_PASSWORD`. (`SUPABASE_ACCESS_TOKEN` is account-level and still valid.)
- [ ] **Google sign-in** — the "Continue with Google" button needs a Google OAuth client ID/secret entered in Dashboard → Auth → Providers → Google (redirect URI `https://ncowtwpxvefhbljwfsxo.supabase.co/auth/v1/callback`). Until then, use the magic link.
- [ ] **Magic-link email volume** — Supabase's built-in SMTP is capped at a handful of emails/hour. For real users, wire a custom SMTP (Resend/Postmark) in Dashboard → Auth → SMTP Settings.
- [ ] **RLS test** — sign in as user A and user B in two private windows; confirm A's `/library` doesn't show B's items.

---

## 🚀 Web — Vercel

```bash
cd ClosetOS
npx vercel@latest login        # one-time, browser
./scripts/deploy.sh             # links + pushes env + deploys --prod
```

After first deploy:
- [ ] Add production URL to Supabase redirect/site URLs (above).
- [ ] In Vercel project settings → **Environment Variables**, confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are present in **Production**.
- [ ] Add a **custom domain** (Project → Settings → Domains). Vercel manages DNS + Let's Encrypt automatically.
- [ ] Smoke test on prod:
  - [ ] `/` renders (light + dark mode).
  - [ ] Sign in via magic link (email arrives, click resolves to `/onboarding` or `/library`).
  - [ ] Add an item → save → image renders from Storage.
  - [ ] Compose an outfit with today's date → confirm `items.details.last_worn_date` updates.
  - [ ] Create a share link → open in incognito → see read-only viewer.
  - [ ] Plan a trip with destination "Goa" + dates within 14 days → suggestion API returns weather + items.
  - [ ] `/account` → download export (.zip) → unzip locally and verify `items.json` + `media/<id>/*.jpg`.

---

## 📱 Mobile — TestFlight (iOS) + Internal Testing (Android)

Requires Apple Developer account ($99/yr) and Google Play Console ($25 one-time).

### One-time setup

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas init                       # links to your Expo project
eas device:create              # iOS only — register your test device
```

### Configure

- [ ] Update `apps/mobile/app.json`:
  - [ ] `expo.ios.bundleIdentifier` → unique (e.g. `com.yourcompany.closetos`)
  - [ ] `expo.android.package` → unique
  - [ ] `expo.version` → bump from `0.1.0`
- [ ] `eas build:configure` → creates `eas.json`. Use the **preview** profile for TestFlight builds, **production** for App Store.
- [ ] Add Supabase env to EAS: `eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://...supabase.co"` and same for the anon key.

### Build + ship

```bash
# iOS — TestFlight
eas build --platform ios --profile preview
eas submit --platform ios --latest

# Android — Internal Testing
eas build --platform android --profile preview
eas submit --platform android --latest
```

After first submission:
- [ ] In **App Store Connect**, add internal testers (your email is enough to start). Apple's TestFlight reviews preview builds within ~24h.
- [ ] In **Play Console**, create an Internal testing track and add tester emails.
- [ ] Verify deep-link auth: tap magic link in Mail on the device → opens app → signed in.

---

## 🔐 Privacy / compliance

- [ ] Add a privacy policy URL (Vercel can host a simple page; required for App Store + Google Play).
- [ ] In `app.json`, the `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` strings are user-facing — review wording.
- [ ] Confirm EXIF stripping works end-to-end: deploy `process-image` edge function (`supabase functions deploy process-image`), upload a photo with GPS, run `exiftool` on the variant in `items-private/*/medium.webp` — should show no GPS.
- [ ] `GET /api/account/export` works on prod (some hosts cap response size — Vercel allows up to 4.5 MB for default fn responses; for large libraries, consider switching to a streamed response or signed S3 URL in a follow-up).
- [ ] `DELETE /api/account` works end-to-end: confirm row in `auth.users` is gone afterward.

---

## ⚡ Performance pass (web)

After live URL is set up:

- [ ] **Lighthouse** on `/library` (with ~50 items): target Perf ≥ 90, A11y ≥ 95.
- [ ] **CLS check**: `ItemCard` already reserves `aspect-[4/5]` so images don't shift.
- [ ] **Long-list virtualization**: if libraries grow > 500 items, swap the static map for `react-virtual` in `apps/web/src/app/library/page.tsx`.
- [ ] **Image variants**: ensure the client requests the `medium` (1024px) variant, not the original. Add a Storage URL helper if needed.

---

## 📈 Post-launch

- [ ] Self-host **PostHog** or wire **Plausible** for product analytics.
- [ ] Wire up **Sentry** in `apps/web/src/app/error.tsx` (currently logs to console).
- [ ] Set up daily backup: `pg_dump` from Supabase to your S3 (Supabase Pro auto-snapshots, or use the `scripts/apply-migrations.mjs` connection in reverse for a custom dump).

---

When every box above is checked, you're live. 🎉
