# ClosetOS — Launch Checklist

End-to-end checklist for shipping the web app to a custom domain and the
mobile app to TestFlight + Google Play internal testing.

---

## ✅ Pre-flight (do once)

- [ ] **DB migrations applied** — both `0001_init.sql` and `0002_match_items_rpc.sql` are loaded in the production Supabase project.
- [ ] **RLS test** — sign in as user A and user B in two private windows; confirm A's `/library` doesn't show B's items.
- [ ] **Storage buckets exist**: `items-private` (private) and `items-public` (public). Migration creates them; verify in Dashboard → Storage.
- [ ] **Service-role key** stored only in Vercel env (never committed, never exposed to client). Anon key is safe to expose.
- [ ] **Auth redirect URLs** include both `http://localhost:3001/auth/callback` (dev) and `https://<your-domain>/auth/callback` (prod). Mobile also needs `closetos://auth/callback`.
- [ ] **Site URL** in Supabase Dashboard → Auth → URL Configuration matches the production hostname.

---

## 🚀 Web — Vercel

```bash
cd ClosetOS
npx vercel@latest login        # one-time, browser
./scripts/deploy.sh             # links + pushes env + deploys --prod
```

After first deploy:
- [ ] Add production URL to Supabase redirect/site URLs (above).
- [ ] In Vercel project settings → **Environment Variables**, confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` are present in **Production**.
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

## 🤖 AI cost guardrails

- [ ] **Auto-fill cache**: hash uploaded image bytes; if the same hash was processed in the last 24 h, return the cached response instead of re-calling Vision. (Stub today.)
- [ ] **Embeddings backlog**: cron the `embed-item` edge function so it batches items missing embeddings every hour, instead of synchronously per save.
- [ ] **Budget alerts**: set spend limits in OpenAI dashboard.

---

## 📈 Post-launch

- [ ] Self-host **PostHog** or wire **Plausible** for product analytics.
- [ ] Wire up **Sentry** in `apps/web/src/app/error.tsx` (currently logs to console).
- [ ] Set up daily backup: `pg_dump` from Supabase to your S3 (Supabase Pro auto-snapshots, or use the `scripts/apply-migrations.mjs` connection in reverse for a custom dump).

---

When every box above is checked, you're live. 🎉
