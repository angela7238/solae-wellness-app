# Solae Guide: implementation and setup

This adds a local implementation to the existing app. It is not deployed, no live database migration has been run, no clients have been enrolled, and no email has been sent.

## What is implemented

- `/guide`: studio-only draft review, source-derived graphs, editable explanation and agreed focus, two explicit review checks, approval, client enrollment/revocation, and notification retry.
- Scan import automatically prepares missing drafts when the feature is enabled. Older scans can be prepared from the studio screen.
- `/portal/login`: passwordless email sign-in for explicitly enrolled in-person clients.
- `/portal`: a private list of only that client's approved summaries.
- `/portal/reports/[id]`: approved explanation, focus and graphs.
- `/api/portal/reports/[id]/pdf`: private PDF download of the same approved snapshot.
- Supabase migration for access mappings, separate draft/published content, optimistic approval revisions, and invalidation when source scan data changes or a backdated scan changes the comparison.

The first implementation is template-based. It does **not** call an external AI model. The initial phrase library lives in `lib/guide/summary.ts`; Angela should review those phrases on a staging sample before clients use them. Product choices remain with Angela. The existing dashboard and product recommendation calculations are not changed.

## Safe rollout order

1. Use a preview deployment and a separate test Supabase project or an appropriate staging environment. Do not point a preview at the production database during functional testing.
2. Apply existing migrations, then `supabase/migrations/20261013_solae_guide.sql` in that test project. The new tables grant no direct access to anon or authenticated database roles. Server handlers verify identity/enrollment and scope every client report query.
3. Set the environment variables below on the preview. Keep the feature disabled until configuration is ready.
4. Configure Supabase email delivery, redirect URLs, and the magic-link template. Test a link in the same browser that requested it. Verify successful sign-in, expiration, sign-out, revocation and absence of another client's data.
5. Configure a verified Resend sender for summary-ready notifications. This adapter is an implementation choice and has not been provisioned. Supabase sign-in emails and ready notifications are separate: the ready email links to `/portal/login`, where the client requests the one-time link.
6. Enroll a synthetic test client from `/guide`, generate a draft, compare its numbers with the source, edit it, save, approve, and test page/PDF parity. There is no automatic enrollment of existing clients.
7. Review the preview with Angela. Production publication and live client access are a separate rollout step.

## Environment variables

Keep existing `APP_PASSWORD`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_URL` configured. Never expose the service role key under a `NEXT_PUBLIC_` name.

| Variable | Purpose |
| --- | --- |
| `SOLAE_GUIDE_ENABLED` | Set to `true` only after migration/configuration; otherwise Guide APIs refuse access and imports keep their previous behavior |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public/publishable auth key; existing `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported as a fallback |
| `SOLAE_APP_URL` | Canonical HTTPS origin, e.g. `https://solaewellnessscan.thesolaestudio.com`; use the preview origin for staging |
| `RESEND_API_KEY` | Server-only key for ready notifications |
| `SOLAE_EMAIL_FROM` | Verified sender address configured with the email provider |

Do not paste keys into chats, commit them, or place them in this document. This implementation has not read your live secrets.

Supabase Auth configuration:

- Site URL: the canonical app origin for the environment.
- Allowed redirect URL: the exact origin plus `/portal/callback`.
- Magic-link email template: keep the Supabase `{{ .ConfirmationURL }}` link so the PKCE exchange receives a `code`. Do not substitute a custom token-hash link without updating the callback implementation.
- Clients must request/open the link in the same browser because the PKCE verifier is in a cookie. If that does not suit clients, implement the documented token-hash confirmation flow as a subsequent change.
- Disable unrestricted public signups in this project if they are not needed by another application. This app uses `shouldCreateUser: false` for client sign-in and explicit studio enrollment.
- Configure production SMTP and Supabase Auth rate limits before rollout. Public login uses a generic response for non-enrolled addresses; email/request abuse still depends on provider rate limits and deployment controls.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Comparison behavior

Guide percentages are computed from actual source marker values, not cached percentages. A category compares only when marker names, marker counts and reference ranges match. Changed/missing coverage is called out; no comparable categories means generation is held.

Movement toward the reference range means distance to the nearest boundary decreases for a marker that was outside range. This differs from the existing dashboard's distance-to-center calculation. They are deliberately not presented as the same metric. Markers already in range are not called improved just because they moved toward the midpoint.

There is no invented threshold for "slight" changes: the summary describes the actual percentages. No body-age estimate, healing phase, diagnoses, product efficacy, or symptom causation is included in the new Guide narrative.

Published content is a snapshot. Saving draft edits does not expose them or replace the last approved snapshot. Editing source scan values invalidates affected summaries so Angela must review again. A backdated import invalidates the next scan's summary and prepares missing drafts.

## Validation

- Production build passed on Next.js 16.4.0.
- `npm run test:guide`: 16 tests passed, covering baseline/dip/mixed changes, changed coverage, malformed values, client ownership, private PDF responses, actual PostgreSQL privileges/revisions/source invalidation, and PDF pagination.
- TypeScript and lint for changed application files passed.
- Full-repository lint still reports pre-existing React hook/ref errors in Supplements, ScanNotes, TimelineTrends and WellnessRadar, plus existing warnings. Those unrelated components were not rewritten for this feature.
- PDF pagination was rendered and inspected using synthetic data.
- Client sign-in page was inspected locally. Live email, full Supabase Auth sign-in, production notification delivery, and production enrollment have not been tested; they require the staging configuration above.
- Framework updated from 16.2.4 to 16.4.0 to address reported security advisories. Compatible dependency patches were applied. Remaining audit warnings are in the development ESLint/fast-glob chain; no forced downgrade was applied. Recheck advisories at rollout.

Known limitation: the initial PDF uses standard fonts. Common curly punctuation is normalized; unsupported non-Latin/emoji glyphs are substituted. Add an appropriately licensed embedded Unicode font before using it for clients whose names or approved wording require those glyphs.

## Commands

```sh
npm ci
npm run test:guide
npm run build
npm run dev
```

The local tests use synthetic data and an in-memory PostgreSQL instance. They do not connect to live Supabase or send email.
