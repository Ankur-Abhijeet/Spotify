# Edge Cases Document
## Personifier — Phase-Wise Edge Cases & Handling (MVP)

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 (MVP) |
| **Date** | 2026-07-06 |
| **Companion Docs** | [Product_requirement.md](Product_requirement.md) · [Architecture.md](Architecture.md) · [Implementation_Plan.md](Implementation_Plan.md) · [eval.md](eval.md) · [decision.md](decision.md) |
| **Purpose** | Catalog edge cases per phase, document expected behavior, and ensure nothing slips through implementation |

> **Convention:** Each edge case is tagged by severity: `[CRITICAL]` (can crash/corrupt), `[HIGH]` (broken UX, data issue), `[MEDIUM]` (degraded UX), `[LOW]` (cosmetic/minor). Edge cases are numbered `EC{phase}.{seq}`.

---

# PHASE 0 — Foundation & Enablement

### EC0.1 [HIGH] Render free-tier cold start after idle

| Aspect | Detail |
|---|---|
| **Scenario** | Render free-tier web services spin down after ~15 min of inactivity. The first request after idle takes 30–60 seconds. |
| **Expected behavior** | The client shows a loading indicator; the API wakes and responds. Subsequent requests are fast. |
| **Handling** | (A) Accept cold starts for MVP — show a "Waking up the server..." loading state. (B) Optional: health-ping cron every 14 min to keep warm. |
| **Test** | Wait 20 min → make first request → measure latency. |

### EC0.2 [MEDIUM] Render Postgres 90-day free expiry

| Aspect | Detail |
|---|---|
| **Scenario** | Render free Postgres instances expire after 90 days and are deleted. |
| **Expected behavior** | Team is alerted before expiry; data is backed up and migrated. |
| **Handling** | Set a calendar reminder at day 75. Script automated `pg_dump` backups. Recreate instance and restore, or migrate to Supabase (no expiry). |
| **Test** | Verify backup/restore procedure works end-to-end. |

### EC0.3 [HIGH] Upstash Redis 10K commands/day exhaustion

| Aspect | Detail |
|---|---|
| **Scenario** | If the app exceeds 10K Redis commands in a day, Upstash throttles or rejects requests. Sessions, queue, and trigger state all break. |
| **Expected behavior** | App falls back gracefully; user is not logged out; queue is reconstructable. |
| **Handling** | (A) Monitor daily command count via Upstash dashboard. (B) Batch Redis operations (pipeline). (C) If approaching limit, degrade: serve cached data, skip non-critical Redis writes. (D) Upgrade to paid Upstash ($0.20/100K) if consistently hitting limit. |
| **Test** | Simulate high-traffic day; verify graceful degradation at limit. |

### EC0.4 [MEDIUM] Environment variable mismatch between local and Render

| Aspect | Detail |
|---|---|
| **Scenario** | Developer adds a new env var locally but forgets to add it to Render dashboard. Service crashes on deploy. |
| **Expected behavior** | Service fails to start with a clear error naming the missing variable. |
| **Handling** | Validate all required env vars at startup (NestJS `ConfigModule` with `isGlobal: true` and validation schema). Fail fast with descriptive error. |
| **Test** | Deploy without a required env var → verify clear error in Render logs. |

---

# PHASE 1 — Core Streaming MVP

## Auth & Sessions

### EC1.1 [CRITICAL] JWT refresh token reuse after rotation

| Aspect | Detail |
|---|---|
| **Scenario** | Attacker captures a refresh token. Legitimate user refreshes (rotating the token). Attacker tries to use the old refresh token. |
| **Expected behavior** | Old refresh token is rejected. If token reuse is detected, **all sessions for that user are revoked** (security best practice). |
| **Handling** | Store refresh token family in Redis; on reuse detection, invalidate entire family. Return 401 with `TOKEN_REUSE_DETECTED`. |
| **Test** | Use a refresh token → refresh again → attempt to use the first (now-old) refresh token. |

### EC1.2 [HIGH] OAuth account linking collision

| Aspect | Detail |
|---|---|
| **Scenario** | User signs up with email (user@example.com), then later tries to log in with Google OAuth which returns the same email. Two accounts shouldn't exist. |
| **Expected behavior** | The OAuth login is linked to the existing email account (after email match verification). User is logged in to their original account. |
| **Handling** | On OAuth callback, check if an account with that email already exists. If yes, link the OAuth provider to the existing account. If the email is unverified on the existing account, require email verification first. |
| **Test** | Sign up with email → log out → OAuth login with same email → verify single account with both auth methods. |

### EC1.3 [HIGH] OAuth provider returns no email

| Aspect | Detail |
|---|---|
| **Scenario** | Some OAuth providers (Facebook) may not return an email (user has it hidden). |
| **Expected behavior** | Prompt the user to provide an email manually during onboarding. |
| **Handling** | If OAuth callback has no email, redirect to a "complete your profile" page requiring email entry + verification. |
| **Test** | Mock OAuth response without email → verify redirect to email collection. |

### EC1.4 [MEDIUM] Concurrent sessions on multiple tabs

| Aspect | Detail |
|---|---|
| **Scenario** | User has the app open in 3 browser tabs. They change settings in tab 1. Tabs 2 and 3 are stale. |
| **Expected behavior** | Tabs 2 and 3 pick up the new settings on next API call or navigation. Playback doesn't conflict — only one tab plays at a time. |
| **Handling** | Use `BroadcastChannel` API to sync state across tabs. For playback, only one tab owns the audio context — other tabs become "remotes." |
| **Test** | Open 3 tabs → change setting in one → verify sync. Play in tab 1 → play in tab 2 → verify tab 1 pauses. |

### EC1.5 [MEDIUM] Email verification link clicked twice

| Aspect | Detail |
|---|---|
| **Scenario** | User clicks the verification link, then clicks it again (from email history). |
| **Expected behavior** | First click verifies the account. Second click shows "Already verified" — not an error. |
| **Handling** | Idempotent: if `email_verified = true`, return success with a message. Token is single-use but the outcome is safe. |
| **Test** | Click verify link twice → verify no error, no re-verification. |

## Playback

### EC1.6 [CRITICAL] Audio URL expires mid-playback

| Aspect | Detail |
|---|---|
| **Scenario** | The audio source URL (from catalog API) expires while a song is playing or queued. |
| **Expected behavior** | Playback interrupts gracefully; the client silently refreshes the URL and resumes (or re-fetches for the next track). |
| **Handling** | On audio `error` event (403/404), call `/playback/stream/{trackId}` to get a fresh URL. Retry playback. If retry fails, skip to next track with a toast notification. |
| **Test** | Mock an expiring URL → verify auto-refresh → verify resumed playback. |

### EC1.7 [HIGH] User plays a track that becomes unavailable

| Aspect | Detail |
|---|---|
| **Scenario** | A track in the user's queue or library is removed from the catalog (licensing change, API issue). |
| **Expected behavior** | Track is greyed out in the UI with "Unavailable." If it's the current track, skip to next. Queue silently removes unavailable tracks. |
| **Handling** | Mark `streamable = false` in catalog; client checks before playback. Queue cleanup job removes unavailable tracks on session load. |
| **Test** | Add track to queue → mark it unavailable → verify skip + UI indicator. |

### EC1.8 [HIGH] Network disconnection during playback

| Aspect | Detail |
|---|---|
| **Scenario** | User loses network while streaming. |
| **Expected behavior** | Playback continues from buffer until buffer runs out. Then pauses with "Connection lost" indicator. Auto-resumes when network returns. |
| **Handling** | HLS.js/Audio element has internal buffering. Listen for `navigator.onLine` changes. On reconnect, resume from buffered position. |
| **Test** | Disable network mid-song → verify buffer plays out → enable network → verify resume. |

### EC1.9 [MEDIUM] Rapid skip (next/next/next)

| Aspect | Detail |
|---|---|
| **Scenario** | User hammers the "next" button 10 times rapidly. |
| **Expected behavior** | Skips to the 10th-next track cleanly. No race conditions, no duplicate play events, no queue corruption. |
| **Handling** | Debounce UI clicks (200 ms). Queue state transitions are atomic — each skip increments the pointer. Cancel any pending audio load on new skip. |
| **Test** | Click next 10 times rapidly → verify correct track plays, queue pointer is correct, no stale audio. |

### EC1.10 [MEDIUM] Empty queue

| Aspect | Detail |
|---|---|
| **Scenario** | User plays the last song in the queue with repeat off and autoplay off. Queue is now empty. |
| **Expected behavior** | Playback stops. "Queue is empty" state shown. Player bar shows the last played track (paused). |
| **Handling** | On queue exhaustion, transition to "idle" state. Don't auto-populate the queue without user consent (or autoplay setting). |
| **Test** | Play a single-track queue → verify clean stop state. |

### EC1.11 [LOW] Seek beyond track duration

| Aspect | Detail |
|---|---|
| **Scenario** | User drags the scrubber past the track's duration (possible via keyboard/accessibility). |
| **Expected behavior** | Clamp to the track's end; trigger "next track" behavior. |
| **Handling** | `Math.min(seekPosition, trackDuration)`. If clamped to end, trigger track-complete logic. |

## Library & Playlists

### EC1.12 [HIGH] Deleting a playlist that's currently playing

| Aspect | Detail |
|---|---|
| **Scenario** | User is listening to a playlist, then deletes it from another tab or the library view. |
| **Expected behavior** | Current playback continues (the queue is already loaded in Redis). The playlist disappears from the library. Queue metadata shows "Deleted playlist." |
| **Handling** | Queue is decoupled from playlist source — deleting the playlist doesn't clear the queue. UI update on next API call. |
| **Test** | Play playlist → delete it → verify playback continues → verify library reflects deletion. |

### EC1.13 [HIGH] Collaborative playlist: concurrent edits

| Aspect | Detail |
|---|---|
| **Scenario** | Two users add/remove/reorder tracks in a collaborative playlist simultaneously. |
| **Expected behavior** | Both edits succeed (last-write-wins for ordering). No data corruption. No duplicate tracks from concurrent adds. |
| **Handling** | Use `position` column with DB constraints. On concurrent reorder, resolve via timestamp (latest wins). Use a DB-level unique constraint on `(playlist_id, track_id)` to prevent duplicate adds. |
| **Test** | Two users add the same track simultaneously → verify only one entry exists. Two users reorder simultaneously → verify consistent state. |

### EC1.14 [MEDIUM] Playlist with 10,000+ tracks

| Aspect | Detail |
|---|---|
| **Scenario** | User creates a playlist with a very large number of tracks. |
| **Expected behavior** | Playlist loads with pagination/virtual scrolling. No performance degradation. |
| **Handling** | Paginate playlist tracks API (50–100 per page). FE uses virtualized list rendering. |
| **Test** | Create playlist with 10K tracks → verify load time, scroll performance. |

### EC1.15 [MEDIUM] Following/unfollowing rapidly (toggle spam)

| Aspect | Detail |
|---|---|
| **Scenario** | User clicks follow/unfollow on an artist 20 times rapidly. |
| **Expected behavior** | Final state is correct (followed or unfollowed). No duplicate DB entries. |
| **Handling** | Debounce UI (300 ms). Backend: `UPSERT` / `INSERT ON CONFLICT` for follows; `DELETE` is idempotent. |
| **Test** | Rapid toggle → verify single DB entry reflecting final state. |

## Search

### EC1.16 [MEDIUM] Search query with special characters

| Aspect | Detail |
|---|---|
| **Scenario** | User searches for `AC/DC`, `Guns N' Roses`, `P!nk`, or enters SQL injection attempts. |
| **Expected behavior** | Special characters are handled; relevant results returned; no SQL injection. |
| **Handling** | Parameterized queries (NestJS/TypeORM). `plainto_tsquery()` for FTS (handles special chars). Sanitize input before constructing `tsvector` queries. |
| **Test** | Search `AC/DC` → verify results. Search `'; DROP TABLE users; --` → verify no impact. |

### EC1.17 [LOW] Search with zero results

| Aspect | Detail |
|---|---|
| **Scenario** | User searches for something that doesn't exist in the catalog. |
| **Expected behavior** | "No results found" with suggestions: "Try different keywords" or browse categories. |
| **Handling** | Return empty array with a `suggestions` field (popular searches, genre hubs). |

### EC1.18 [MEDIUM] Search-as-you-type: rapid typing

| Aspect | Detail |
|---|---|
| **Scenario** | User types quickly — each keystroke could fire an API call. |
| **Expected behavior** | Debounced requests (300 ms); only the latest query's results are displayed (no race condition where an older query's results overwrite newer ones). |
| **Handling** | FE debounce (300 ms). Cancel previous `AbortController` on new keystroke. Use request sequence ID to discard stale responses. |
| **Test** | Type "bey" then quickly "beyonce" → verify only "beyonce" results shown, not stale "bey" results. |

---

# PHASE 2 — Adaptive Discovery v1

## Trigger Engine

### EC2.1 [HIGH] Discovery prompt shown during explicit user intent

| Aspect | Detail |
|---|---|
| **Scenario** | User taps a specific song from search results. The next song boundary would trigger a discovery prompt. |
| **Expected behavior** | **No prompt.** Explicit user-initiated playback is sacred — discovery only triggers after ambient/queue/autoplay-driven transitions. |
| **Handling** | Set a `user_initiated = true` flag on the playback session when the user explicitly selects a track. The trigger engine checks this flag and skips if true. Flag resets after the explicit track finishes and queue resumes. |
| **Test** | Search → play specific song → song ends → verify no prompt on the next boundary (prompt OK after the *next* auto-played track). |

### EC2.2 [HIGH] Discovery prompt during a queued album

| Aspect | Detail |
|---|---|
| **Scenario** | User plays an album front-to-back by clicking "Play album." Trigger engine hits the frequency threshold mid-album. |
| **Expected behavior** | **No prompt.** Album is a coherent listening session — interrupting it is jarring. |
| **Handling** | Trigger engine checks if the current queue context is "album" (all tracks from one album, in order). If yes, suppress until the album completes. |
| **Test** | Play a 12-track album → verify zero prompts during the album → verify prompt resumes after album ends and queue continues. |

### EC2.3 [HIGH] Private session + discovery prompt

| Aspect | Detail |
|---|---|
| **Scenario** | User enables private session. Discovery trigger fires. |
| **Expected behavior** | **No prompt at all** — the trigger engine is short-circuited. No events are emitted. |
| **Handling** | First check in trigger engine: `if (private_session) return { prompt: false }`. |
| **Test** | Enable private → play 20 songs → verify zero prompts and zero events in DB. |

### EC2.4 [MEDIUM] Trigger counter overflow across sessions

| Aspect | Detail |
|---|---|
| **Scenario** | User listens to 3 songs, closes the app, reopens, listens to 2 more. Has the counter carried over? |
| **Expected behavior** | Counter persists per session in Redis. A new browser session starts a new session ID → new counter. BUT if the user resumes the same session (same tab, reconnect), the counter continues. |
| **Handling** | Counter is keyed by `sessionId`. New session = new counter. Resume session = same counter. Redis TTL (24h) auto-cleans old counters. |
| **Test** | Play 3 songs → close tab → reopen → verify new session starts counter at 0. Refresh (same session) → verify counter preserved. |

### EC2.5 [MEDIUM] Backoff exceeds maximum → user never sees prompts again

| Aspect | Detail |
|---|---|
| **Scenario** | User dismisses 20 prompts in a row. Backoff keeps increasing. They may never see another prompt. |
| **Expected behavior** | Backoff has a **maximum** (e.g., N ≤ 20 songs between prompts). Backoff also **decays over time** (e.g., halves every 24 hours). |
| **Handling** | `disc:backoff:{userId}` has a max cap. A daily cron decays all backoff counters. |
| **Test** | Dismiss 20 prompts → verify backoff caps. Wait 24h (or simulate) → verify backoff decays. |

## Split-Screen UX

### EC2.6 [HIGH] Both candidates are the same track

| Aspect | Detail |
|---|---|
| **Scenario** | A bug in candidate generation returns the same track for both sides. |
| **Expected behavior** | This should **never happen**. If it does, the Discovery module rejects the pair and either retries or skips the prompt. |
| **Handling** | Validation in Discovery module: `if (candidateA.id === candidateB.id) → retry or skip`. Log as an error. |
| **Test** | Mock Recommendation Service returning identical candidates → verify retry/skip behavior. |

### EC2.7 [HIGH] Candidate track becomes unavailable between pair generation and user choice

| Aspect | Detail |
|---|---|
| **Scenario** | Recommendation generates a pair. While the user is looking at the split screen, the chosen track's audio URL expires or the track is removed from the catalog. |
| **Expected behavior** | On choice, the system detects the unavailable track, quickly resolves a fresh URL, or substitutes with the next track in queue. User sees a brief "Loading..." rather than an error. |
| **Handling** | On `POST /discovery/choice`, resolve the audio URL fresh. If 404/gone, fall back: play the other candidate (if available) or resume queue. Log the error. |
| **Test** | Generate pair → make one track unavailable → choose it → verify graceful fallback. |

### EC2.8 [MEDIUM] User interacts with split screen via keyboard and mouse simultaneously

| Aspect | Detail |
|---|---|
| **Scenario** | User presses → (right arrow) while also clicking the left side. |
| **Expected behavior** | First event wins. Subsequent events within a short window (200 ms) are ignored. |
| **Handling** | Mutex/lock on the choice handler: once a choice is registered, ignore further inputs until the transition completes. Use the `promptId` to ensure single-submission. |
| **Test** | Simultaneously press → and click left → verify only one choice recorded. |

### EC2.9 [MEDIUM] Split screen timeout at exactly the same moment as a choice

| Aspect | Detail |
|---|---|
| **Scenario** | The timeout fires (e.g., 30s) at the exact moment the user clicks a side. |
| **Expected behavior** | If the choice was registered before the timeout handler fires, the choice wins. If the timeout fires first, it's `no_choice`. |
| **Handling** | Client-side: on choice, cancel the timeout timer. Server-side: `promptId` is single-use — first submission (choice or timeout `no_choice`) wins. |
| **Test** | Set short timeout (5s) → click at 4.9s → verify choice recorded, not timeout. |

### EC2.10 [HIGH] `promptId` replay / double-submit

| Aspect | Detail |
|---|---|
| **Scenario** | Network glitch causes the client to submit the same choice twice. Or a malicious user replays a valid `promptId`. |
| **Expected behavior** | First submission accepted. Second submission returns 200 OK with no side effects (idempotent). |
| **Handling** | `promptId` is stored with a `resolved_at` timestamp. On second submission, if `resolved_at IS NOT NULL`, return the previous result. |
| **Test** | Submit same `promptId` twice → verify single event in DB, second response matches first. |

### EC2.11 [LOW] Split-screen renders on a very small screen (320px wide)

| Aspect | Detail |
|---|---|
| **Scenario** | On a very narrow mobile screen, the 50/50 split is too cramped to read. |
| **Expected behavior** | On screens < 400px, switch to a **top/bottom stacked layout** instead of side-by-side. |
| **Handling** | CSS media query: `@media (max-width: 400px)` switches to flex-column. |
| **Test** | Resize to 320px → verify stacked layout, readable text, tap targets ≥ 44px. |

## Event Pipeline

### EC2.12 [HIGH] Cron job fails mid-processing

| Aspect | Detail |
|---|---|
| **Scenario** | The cron job that processes discovery events crashes halfway through a batch. |
| **Expected behavior** | Already-processed events are not re-processed. Unprocessed events are picked up in the next cron cycle. |
| **Handling** | Each event has a `processed_at` column. Cron queries `WHERE processed_at IS NULL`. Updates `processed_at` per-row after processing. Transaction per row (not per batch) to avoid partial rollback. |
| **Test** | Kill cron mid-batch → restart → verify no duplicates, all events eventually processed. |

### EC2.13 [MEDIUM] Downstream engagement backfill for a track the user never finishes

| Aspect | Detail |
|---|---|
| **Scenario** | User makes a discovery choice, starts the track, but then closes the app without finishing, skipping, or saving. |
| **Expected behavior** | The `downstream_engagement` field is backfilled with `{ action: "abandoned", listen_duration_ms: X }` based on whatever data is available. |
| **Handling** | Backfill cron runs periodically. For events without downstream engagement after 1 hour, set `action = "abandoned"` with the last known listen position. |
| **Test** | Choose a track → close app → verify backfill after cron runs. |

## Recommendation Service

### EC2.14 [HIGH] Recommendation Service down (Render cold start or crash)

| Aspect | Detail |
|---|---|
| **Scenario** | NestJS calls the Recommendation Service HTTP endpoint, but it's down (cold start, crash, deploy). |
| **Expected behavior** | Discovery module falls back: either show a **heuristic pair** (popular-in-genre vs. random-adjacent) or **skip the prompt entirely**. Playback never blocks. |
| **Handling** | HTTP call to Recommendation with 3s timeout. On timeout/error: fallback logic. Circuit breaker: after 3 consecutive failures, stop attempting for 5 min. |
| **Test** | Stop Recommendation Service → trigger prompt → verify heuristic pair or skip. Verify playback unaffected. |

### EC2.15 [MEDIUM] New user with no embedding (cold start)

| Aspect | Detail |
|---|---|
| **Scenario** | User skipped onboarding or the embedding initialization failed. No taste embedding exists. |
| **Expected behavior** | Recommendation falls back to popularity-based pair generation. Embedding is created on first discovery choice. |
| **Handling** | Recommendation checks for embedding existence. If null, use `popular-in-seed-genre` pairs. First choice triggers embedding initialization. |
| **Test** | Create user without onboarding → trigger discovery → verify popularity-based pair → make choice → verify embedding created. |

---

# PHASE 3 — Personalization Depth

## Batch Retraining

### EC3.1 [CRITICAL] Batch retrain produces degenerate embeddings

| Aspect | Detail |
|---|---|
| **Scenario** | A bug in the training script produces all-zero embeddings, NaN values, or wildly shifted vectors. All recommendations break. |
| **Expected behavior** | The system detects the degenerate output and **does not promote** the new embeddings. Previous embeddings remain active. Alert is raised. |
| **Handling** | Post-training validation: check for NaN, all-zeros, L2 norm outliers, cosine similarity to previous version (flag if average shift > threshold). Only overwrite embeddings after validation passes. Keep previous version as backup. |
| **Test** | Inject a bug → run retrain → verify embeddings NOT overwritten → verify alert/log. |

### EC3.2 [HIGH] Batch retrain exceeds Render free-tier timeout

| Aspect | Detail |
|---|---|
| **Scenario** | As event data grows, the nightly cron job takes longer than Render's cron execution limit. |
| **Expected behavior** | Job is killed by Render. Incomplete processing detected on next run. |
| **Handling** | (A) Incremental processing: only process events since last run. (B) Checkpoint progress. (C) If consistently hitting limits, split into multiple cron invocations or migrate to a larger instance. |
| **Test** | Simulate large dataset → verify incremental processing completes in time. |

### EC3.3 [HIGH] Model rollback needed but previous embeddings were overwritten

| Aspect | Detail |
|---|---|
| **Scenario** | New model is promoted (embeddings overwritten). Metrics degrade. Need to rollback. |
| **Expected behavior** | Previous embedding version is available for instant rollback. |
| **Handling** | Store embeddings with a `version` column. Retrain writes `version = N+1`. Promotion flips a `active_version` pointer. Rollback simply changes the pointer back. Never delete old versions (prune after 3 versions). |
| **Test** | Retrain → promote → rollback → verify old embeddings served. |

## Contextual Model

### EC3.4 [MEDIUM] Context inference is wrong (thinks "workout" when user is sleeping)

| Aspect | Detail |
|---|---|
| **Scenario** | The contextual model infers the wrong mood/activity based on recent behavior (e.g., user played high-energy tracks but is actually in a calm mood now). |
| **Expected behavior** | Candidates may feel off, but the system self-corrects: the user's choice provides a corrective signal. Over 2–3 discovery interactions, the context vector adjusts. |
| **Handling** | Context vector is a blend of recent behavior + time-of-day + explicit signals. Don't over-weight any single signal. Choices provide corrective gradient. |
| **Test** | Play calm music → verify context shifts → play energetic music → verify context shifts back. |

### EC3.5 [MEDIUM] User has very few events (< 5) — context vector is unreliable

| Aspect | Detail |
|---|---|
| **Scenario** | New-ish user has 3 discovery events. Context vector is too sparse to be meaningful. |
| **Expected behavior** | Fall back to time-of-day-only context (morning = calm/upbeat, evening = chill) until enough data accumulates. |
| **Handling** | If event count < threshold (e.g., 10), use default context templates. Flag `context_confidence = low`. |
| **Test** | User with 3 events → verify default context used → after 15 events → verify personalized context. |

## Made-for-You Mixes

### EC3.6 [HIGH] Mix generation produces duplicate tracks across mixes

| Aspect | Detail |
|---|---|
| **Scenario** | The same popular track appears in Daily Mix 1, Daily Mix 2, and Discover Weekly. |
| **Expected behavior** | A track should appear in at most 1 mix (or 2 if in different "mood" categories). No exact duplicates within a single mix. |
| **Handling** | Mix generation deduplicates globally: maintain a `used_tracks` set during generation. Within a single mix, enforce uniqueness via set. |
| **Test** | Generate 5 mixes → verify no track appears in more than 2 mixes, zero duplicates within a mix. |

### EC3.7 [MEDIUM] Mix generation for user with no discovery history

| Aspect | Detail |
|---|---|
| **Scenario** | User hasn't used Discovery at all (disabled or new). Mixes have no learned preferences to draw from. |
| **Expected behavior** | Fall back to onboarding-seed-based mixes (genre-based popular tracks). Label as "Based on your favorite genres." |
| **Handling** | Mix generation checks discovery event count. If < 5, use seed-genre popularity. If 5–20, blend seed + discovery. If > 20, full personalization. |
| **Test** | User with zero discovery events → verify genre-based mixes generated. |

### EC3.8 [MEDIUM] Mix contains tracks that become unavailable after generation

| Aspect | Detail |
|---|---|
| **Scenario** | Nightly mix is generated. By afternoon, some tracks are removed from the catalog. |
| **Expected behavior** | Unavailable tracks are skipped during playback. Mix shows "Unavailable" for those tracks. |
| **Handling** | On mix load, cross-check `streamable` flag. Filter out unavailable. If too many removed (> 50% of mix), regenerate on demand. |
| **Test** | Generate mix → mark 3 tracks unavailable → load mix → verify they're filtered/skipped. |

## Discovery Recap

### EC3.9 [MEDIUM] Recap for user with < 20 discovery interactions

| Aspect | Detail |
|---|---|
| **Scenario** | User opens Discovery Recap but has only 5 interactions. Not enough data for meaningful trends. |
| **Expected behavior** | Show a "Keep discovering!" encouragement message with a progress indicator ("5/20 interactions — discover more to unlock your full recap!"). |
| **Handling** | Check event count before rendering. If < 20, show the partial/encouragement view. |
| **Test** | User with 5 events → verify encouragement view. User with 25 events → verify full recap. |

### EC3.10 [LOW] Recap shows artists the user has since stopped liking

| Aspect | Detail |
|---|---|
| **Scenario** | Recap shows "Top artist discovered: Artist X" but the user's recent choices actively reject Artist X. |
| **Expected behavior** | Recap is historical — it shows what was discovered, not current taste. Label clearly: "In [month], you discovered..." |
| **Handling** | Time-scope the recap (last 30 days). Historical framing in the UI copy. |

## Experimentation

### EC3.11 [HIGH] Control cohort users accidentally get discovery features

| Aspect | Detail |
|---|---|
| **Scenario** | Hash-based cohort assignment has a bug and some "control" users see discovery prompts. |
| **Expected behavior** | Control users should **never** see discovery prompts. Their experience is baseline Spotify-parity only. |
| **Handling** | Double-check: trigger engine verifies cohort assignment before prompting. Both client-side (don't render split screen) and server-side (don't return pair) checks. |
| **Test** | Create a known-control user → play 50 songs → verify zero prompts. |

### EC3.12 [MEDIUM] Cohort sizes are imbalanced

| Aspect | Detail |
|---|---|
| **Scenario** | The hash function produces 70/30 split instead of 50/50. |
| **Expected behavior** | Cohorts should be approximately balanced (within 5% tolerance). |
| **Handling** | Test the hash function over a range of user IDs. Use a well-distributed hash (e.g., MD5 or CRC32 of user_id, modulo 100, assign < 50 = active, ≥ 50 = control). |
| **Test** | Hash 10K synthetic user IDs → verify split is 48–52%. |

---

# Cross-Phase Edge Cases

### ECX.1 [CRITICAL] Postgres connection exhaustion

| Aspect | Detail |
|---|---|
| **Scenario** | Render free tier + Supabase both have connection limits (e.g., Supabase free = 60 connections). NestJS + FastAPI + cron jobs may exhaust them. |
| **Expected behavior** | Connection pooling prevents exhaustion. If exhausted, requests fail with a clear error (not a hang). |
| **Handling** | Use connection pooling (PgBouncer on Supabase, or NestJS TypeORM pooling). NestJS pool: max 10 connections. FastAPI: max 5 connections. Cron: max 2. Total: 17 << 60 limit. |
| **Test** | Under load, verify total connection count stays within limit. |

### ECX.2 [HIGH] User deletes their account

| Aspect | Detail |
|---|---|
| **Scenario** | User requests account deletion. Data exists across Postgres (users, library, events, embeddings, playlists, mixes) and Redis (sessions, queue, trigger state). |
| **Expected behavior** | All PII is deleted. Discovery events are anonymized (user_id nullified or replaced with a hash). Sessions and Redis keys are purged. Deletion is irreversible. |
| **Handling** | Cascade delete in Postgres (user → library_items, playlists, etc.). Anonymize discovery_events (set user_id to null, keep for model training). Purge Redis keys matching `*:{userId}`. Confirmation step in UI. |
| **Test** | Create user with full data → delete → verify zero PII in all stores → verify anonymized events remain. |

### ECX.3 [HIGH] CSRF / XSS on the split-screen choice endpoint

| Aspect | Detail |
|---|---|
| **Scenario** | Attacker crafts a malicious page that auto-submits a discovery choice for a logged-in user. |
| **Expected behavior** | Request is rejected — CSRF protection blocks cross-origin submissions. |
| **Handling** | (A) Use `SameSite=Strict` cookies. (B) Require a CSRF token in the choice POST body. (C) Validate `Origin` header. (D) The `promptId` is effectively a CSRF token (single-use, server-generated). |
| **Test** | Attempt cross-origin POST to `/discovery/choice` → verify rejection. |

### ECX.4 [MEDIUM] Time zone edge cases for time-of-day features

| Aspect | Detail |
|---|---|
| **Scenario** | Home shelves are "time-of-day aware" (morning vs. evening). But the server is in UTC and the user is in IST (+5:30). |
| **Expected behavior** | Time-of-day is computed from the **user's local time**, not the server's. |
| **Handling** | Client sends timezone (or offset) with relevant API calls. Server computes local time for the user. Alternatively, client-side determines which shelf variant to request. |
| **Test** | Set browser timezone to UTC+9 → request Home at 2 AM UTC (11 AM local) → verify "morning" shelves, not "night." |

### ECX.5 [LOW] Unicode/emoji in playlist names and descriptions

| Aspect | Detail |
|---|---|
| **Scenario** | User creates a playlist named "🔥 Summer Vibes 🌴" or with Chinese/Arabic characters. |
| **Expected behavior** | Full Unicode support. Name renders correctly. Search finds it. URL-safe slug generated for sharing. |
| **Handling** | Postgres `TEXT` columns handle Unicode natively. Ensure `utf8mb4` equivalent encoding. Generate URL-safe slugs with `slugify` (strip emoji, transliterate). Full-text search: `to_tsvector('simple', ...)` handles Unicode tokens. |
| **Test** | Create playlist with emoji + CJK characters → verify display, search, and share link. |

### ECX.6 [MEDIUM] Rate limiting: brute-force login attempts

| Aspect | Detail |
|---|---|
| **Scenario** | Attacker attempts thousands of login requests with different passwords. |
| **Expected behavior** | After 5 failed attempts for the same email in 15 minutes, lock the account temporarily and return 429. |
| **Handling** | Rate limit login endpoint: 5 attempts/15 min per email (tracked in Redis). Return `429 Too Many Requests` with `Retry-After` header. Optionally require CAPTCHA after 3 failed attempts. |
| **Test** | 6 rapid failed logins → verify 429 on attempt 6. Wait 15 min → verify login allowed again. |

---

*End of Document*
