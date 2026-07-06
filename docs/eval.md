# Evaluation Document
## Personifier — Phase-Wise Evaluation Plan (MVP)

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 (MVP) |
| **Date** | 2026-07-06 |
| **Companion Docs** | [Product_requirement.md](Product_requirement.md) · [Architecture.md](Architecture.md) · [Implementation_Plan.md](Implementation_Plan.md) |
| **Purpose** | Define acceptance criteria, test strategies, KPI gates, and sign-off checklists for every MVP delivery phase |
| **Infrastructure** | **Free tier only** — Vercel, Render, Upstash Redis, Render/Supabase Postgres |

> **⚠️ MVP Scope:** This evaluation covers **Phases 0–3** only. Phases 4–5 (social, offline/DRM, billing, ads, Connect, scale/multi-region) are **deferred to post-MVP** and not evaluated here.

---

## 0. How to Read This Document

Each phase section is structured as follows:

1. **Phase Summary** — What ships and its PRD/Architecture mapping.
2. **Functional Evaluation** — Feature-by-feature acceptance criteria with test cases.
3. **Non-Functional Evaluation** — Performance, security, reliability checks.
4. **Architecture Evaluation** — Validates that the system matches the Architecture document.
5. **KPI / Analytics Gate** — Measurable metrics that must be met to pass the phase.
6. **Regression Scope** — What prior-phase functionality must be re-verified.
7. **Sign-Off Checklist** — Final yes/no gate for phase completion.

> **Pass/Fail convention:** Each criterion is tagged `[MUST]` (blocks phase exit) or `[SHOULD]` (recommended, tracked as tech-debt if skipped).

---

# PHASE 0 — Foundation & Enablement

> **Duration:** ~1 sprint (2 weeks) · **Sprint:** S1
> **PRD Mapping:** Infrastructure prerequisites (not user-facing)
> **Architecture Mapping:** Vercel + Render + GitHub Actions CI/CD; Postgres + Redis provisioned

## 0.1 Phase Summary

Stand up the developer-experience and hosting foundation on free-tier services. No user-facing features — the goal is that a developer can clone, run locally, open a PR, and have it auto-tested and deployed to Vercel/Render.

## 0.2 Functional Evaluation

### EP0-01: Repository & Project Scaffolding (P0-E1)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 01 | Monorepo structure exists (`apps/web`, `apps/api`, `packages/*`) | `[MUST]` | Manual inspection | Dirs exist; build from root succeeds |
| 02 | Lint, format, and commit hooks enforced | `[MUST]` | Commit a malformed file | Hook blocks commit; linter errors reported |
| 03 | TypeScript config unified across packages | `[MUST]` | `tsc --noEmit` from root | Zero errors |
| 04 | Env config documented (local + Render + Vercel) | `[MUST]` | Run app without `.env` | Clear error message; no hardcoded secrets |

### EP0-02: Hosting & Database Setup (P0-E2)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 05 | Vercel project auto-deploys `apps/web` on merge | `[MUST]` | Merge to `main` → check Vercel | Site live at Vercel URL |
| 06 | Render web service deploys `apps/api` on merge | `[MUST]` | Merge to `main` → check Render | API responds at Render URL |
| 07 | Postgres (Render/Supabase) accessible from API | `[MUST]` | Run migration → query | Tables created; data returned |
| 08 | Upstash Redis accessible from API | `[MUST]` | SET/GET test key | Value stored and retrieved |
| 09 | Image storage (Cloudinary/Supabase) configured | `[MUST]` | Upload test image | Image accessible via URL |

### EP0-03: CI/CD Pipeline (P0-E3)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 10 | PR triggers build + test + lint in GitHub Actions | `[MUST]` | Open a PR with a failing test | Pipeline blocks merge |
| 11 | Vercel preview deploy on PR | `[SHOULD]` | Open PR → check Vercel | Preview URL available |
| 12 | Auto-deploy on merge to `main` | `[MUST]` | Merge → verify both Vercel + Render | Both updated |

### EP0-04: Health & Logging (P0-E4)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 13 | Health/readiness endpoint responds | `[MUST]` | `GET /health` | 200 OK with status |
| 14 | Structured JSON logging | `[SHOULD]` | Trigger log event → check Render logs | Logs queryable by level |

## 0.3 Non-Functional Evaluation

| # | Criteria | Type | Target | Test Method |
|---|---|---|---|---|
| 15 | Local dev bootstrap time | `[SHOULD]` | < 10 min from clone to running | Time a fresh clone |

## 0.4 Architecture Evaluation

| # | Criteria | Pass Condition |
|---|---|---|
| 16 | Monorepo modules match Architecture domain boundaries | Module dirs exist even if stubs |
| 17 | Vercel hosts FE, Render hosts BE (as per Architecture) | Verified deployment |
| 18 | Postgres + Redis on free tiers | Free-tier instances confirmed |

## 0.5 Sign-Off Checklist

- [ ] Green CI pipeline on PR
- [ ] Auto-deploy to Vercel + Render working
- [ ] Postgres + Redis accessible from API
- [ ] Local dev bootstrap documented and verified
- [ ] All `[MUST]` criteria above pass

---

# PHASE 1 — Core Streaming MVP

> **Duration:** ~4 sprints (8 weeks) · **Sprints:** S2–S5
> **PRD Mapping:** A1 (Auth), A2 (Playback), A3 (Search – Postgres FTS), A4 (Library & Playlists), A5 (Home – heuristic), A6 (Artist/Album pages)
> **Architecture Mapping:** Modular monolith on Render; audio from catalog API; Postgres FTS; Upstash Redis

## 1.1 Phase Summary

A user can sign up, browse/search the catalog, build a library and playlists, and play music end-to-end. Home is rule-based (recently played, popular, seeded genres). No ML yet.

## 1.2 Functional Evaluation

### EP1-01: Auth & Onboarding (P1-E1 · PRD A1)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 01 | Email signup with verification | `[MUST]` | Register with email → verify link | Account active only after verification |
| 02 | Email login with JWT access + refresh tokens | `[MUST]` | Login → inspect tokens → use refresh | Access token works; refresh rotates correctly |
| 03 | OAuth login (Google, Apple, Facebook) | `[MUST]` | Login with each provider | Account created/linked; redirects work |
| 04 | Password reset flow | `[MUST]` | Request reset → use link → login with new password | Old password rejected; new one works |
| 05 | Invalid credentials rejected | `[MUST]` | Login with wrong password / non-existent email | 401 returned; no information leakage |
| 06 | Onboarding: pick 3–5 genres/artists | `[MUST]` | Complete onboarding; verify seed data persisted | Selections stored; influence heuristic Home |
| 07 | Session management ("remember me") | `[SHOULD]` | Close browser → reopen | Session persists per setting |

### EP1-02: Catalog & Artist/Album Pages (P1-E2 · PRD A6)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 08 | Catalog ingestion from free music source API | `[MUST]` | Run ingestion; query DB | Tracks, artists, albums populated with metadata |
| 09 | Track detail API (< 200 ms) | `[MUST]` | `GET /catalog/tracks/{id}` + latency measure | Full metadata returned; latency < 200 ms |
| 10 | Album detail API with track listing | `[MUST]` | `GET /catalog/albums/{id}` | Complete track list + metadata |
| 11 | Artist page: top tracks, discography, related artists, bio | `[MUST]` | `GET /catalog/artists/{id}` | All fields populated; related artists returned |
| 12 | Follow artist button functional | `[MUST]` | Follow → verify in library | Idempotent; shows in followed artists |
| 13 | Images served from Cloudinary/Supabase Storage | `[MUST]` | Inspect image URLs | All art served from storage URL |

### EP1-03: Streaming & Core Player (P1-E3 · PRD A2)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 14 | Time-to-audio < 500 ms | `[MUST]` | Measure from play-tap to first audio | < 500 ms on broadband (P95) |
| 15 | Play, pause, next, previous, seek, volume, mute | `[MUST]` | Test each control | All function correctly |
| 16 | Shuffle mode (random, non-repeating within cycle) | `[MUST]` | Enable shuffle; play through queue | Randomized order; no immediate repeats |
| 17 | Repeat modes (off / all / one) | `[MUST]` | Test each mode | Correct behavior at end of queue/track |
| 18 | Persistent bottom playback bar across navigation | `[MUST]` | Navigate between pages while playing | Bar persists; playback uninterrupted |
| 19 | Queue management (view, play-next, add, reorder, clear) | `[MUST]` | Perform each queue operation | Queue state correct; reorder persists |
| 20 | Crossfade between tracks | `[SHOULD]` | Enable crossfade; listen at track boundary | Smooth crossfade; configurable duration |
| 21 | Gapless playback | `[SHOULD]` | Play consecutive tracks from same album | No audible gap |
| 22 | Resume playback across sessions | `[MUST]` | Close app → reopen → resume | Resumes at correct position |
| 23 | Audio quality selection | `[SHOULD]` | Change quality setting | Setting persists (actual bitrate depends on source) |
| 24 | Full-screen Now Playing view | `[MUST]` | Open Now Playing | Art, title, artist, up-next displayed; lyrics placeholder |

### EP1-04: Library & Playlists (P1-E4 · PRD A4)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 25 | Like/unlike songs (idempotent) | `[MUST]` | Like → like again → unlike | State correct; no duplicates |
| 26 | Save/follow albums and artists | `[MUST]` | Save each type; verify in library | Items appear in correct library section |
| 27 | Playlist CRUD (create, read, update, delete) | `[MUST]` | Full lifecycle test | All operations succeed; deletion permanent |
| 28 | Add/remove/reorder tracks in playlist | `[MUST]` | Add → reorder → remove | Order persists; track count correct |
| 29 | Drag-and-drop reordering (FE) | `[SHOULD]` | Drag tracks in playlist UI | Visual + persisted order match |
| 30 | Collaborative playlist flag | `[MUST]` | Create collab playlist; second user edits | Both users can add/remove tracks |
| 31 | Public/private playlist visibility | `[MUST]` | Set private; attempt access from another user | Private playlists not visible to others |
| 32 | Playlist cover image upload | `[SHOULD]` | Upload custom image | Image stored and displayed via Cloudinary/Supabase |
| 33 | Library filter/sort (recent, alpha, creator) | `[MUST]` | Apply each sort/filter | Results correctly ordered/filtered |

### EP1-05: Search — Postgres FTS (P1-E5 · PRD A3 basic)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 34 | Universal search across tracks, artists, albums, playlists | `[MUST]` | Search for known items of each type | Relevant results returned |
| 35 | Search results < 300 ms | `[MUST]` | Measure search latency | P95 < 300 ms |
| 36 | Search-as-you-type with debouncing | `[MUST]` | Type partial query | Instant results update; no excess API calls |
| 37 | Recent searches persisted per user | `[SHOULD]` | Search → close → reopen search | Recent searches displayed |
| 38 | Browse by genre/mood/category hubs | `[MUST]` | Navigate browse section | Hubs render with categorized content |
| 39 | `tsvector` index stays in sync with catalog | `[MUST]` | Ingest new catalog item → search for it | Found immediately (trigger-based sync) |

### EP1-06: Heuristic Home & Settings (P1-E6 · PRD A5, A11)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 40 | Home shelves: recently played, popular, seeded genres | `[MUST]` | Login with seed data + play history | Shelves populated and relevant |
| 41 | Time-of-day aware shelves | `[SHOULD]` | Check Home in morning vs. evening | Different shelf ordering/content |
| 42 | Home initial render < 2 s (P95) | `[MUST]` | Measure page load | P95 < 2 seconds |
| 43 | Settings: profile editing, playback prefs, theme, language | `[MUST]` | Change each setting → verify | Settings persist and apply immediately |

## 1.3 Non-Functional Evaluation

| # | Criteria | Type | Target | Test Method |
|---|---|---|---|---|
| 44 | Time-to-audio (TTA) | `[MUST]` | < 500 ms P95 | Performance test (broadband) |
| 45 | Home page load | `[MUST]` | < 2 s P95 | Lighthouse / Playwright timing |
| 46 | Catalog API latency | `[MUST]` | < 200 ms | API test |
| 47 | Search latency (Postgres FTS) | `[MUST]` | < 300 ms P95 | API test |
| 48 | OAuth2/OIDC + JWT security | `[MUST]` | No token leakage; proper rotation | Security review |
| 49 | HTTPS only | `[MUST]` | Zero HTTP requests | Vercel/Render enforce HTTPS by default |
| 50 | WCAG 2.1 AA compliance (base) | `[SHOULD]` | Keyboard nav, contrast, focus | axe/Lighthouse accessibility audit |
| 51 | Render cold-start latency | `[SHOULD]` | < 5 s (first request after idle) | Measure after 30 min idle |

## 1.4 Architecture Evaluation

| # | Criteria | Pass Condition |
|---|---|---|
| 52 | System is a modular monolith (single NestJS service on Render) | One Render web service with domain-separated modules |
| 53 | Postgres is the system of record | All listed entities present in Postgres schema |
| 54 | Search uses Postgres FTS (`tsvector` + GIN indexes) | Search queries hit Postgres, not any external search service |
| 55 | Upstash Redis handles sessions, queue, now-playing, cache | No session/queue state in Postgres or in-process |
| 56 | Images served from Cloudinary/Supabase Storage | Art stored in free-tier storage, served via HTTPS URL |
| 57 | No paid services used | Verify $0 infrastructure cost |

## 1.5 KPI Gate

| Metric | Target | Measurement Method |
|---|---|---|
| E2E flow completion (signup → search → play → save → playlist) | 100% pass | Automated E2E (Playwright) |
| Time-to-audio | < 500 ms P95 | Performance test |
| Home render | < 2 s P95 | Performance test |
| Open P0/P1 bugs | 0 | Bug tracker |

## 1.6 Regression Scope

- Phase 0: CI/CD, hosting, database connectivity — spot check

## 1.7 Sign-Off Checklist

- [ ] All `[MUST]` criteria in EP1-01 through EP1-06 pass
- [ ] Performance SLOs met (TTA, Home, Search, Catalog)
- [ ] E2E test suite green on Vercel + Render
- [ ] Security review completed (auth, JWT)
- [ ] Accessibility baseline audit passed
- [ ] No open P0/P1 bugs
- [ ] Auto-deploying via GitHub → Vercel/Render

---

# PHASE 2 — Adaptive Discovery v1

> **Duration:** ~4 sprints (8 weeks) · **Sprints:** S6–S9
> **PRD Mapping:** B1–B7 (Discovery concept, trigger logic, candidate selection, split-screen UX, event capture, basic pairwise learning, discovery settings)
> **Architecture Mapping:** Postgres event tables; Recommendation Service (FastAPI) on Render; pgvector embeddings; cron-based processing

## 2.1 Phase Summary

Add the split-screen A/B Discovery prompt, capture every choice as a structured event in Postgres, deploy the Recommendation Service (Python/FastAPI on Render's second free service), and close a basic learning loop (pairwise preference → taste embedding via pgvector) that begins to influence candidate selection and Home.

## 2.2 Functional Evaluation

### EP2-01: Postgres Event Pipeline & pgvector (P2-E1)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 01 | `discovery_events` and `playback_events` tables exist with indexes | `[MUST]` | Check schema | Tables live; JSONB columns present |
| 02 | Playback events inserted from monolith (play/skip/save/finish) | `[MUST]` | Play tracks → check table | Events appear with correct schema |
| 03 | pgvector extension enabled; embedding tables created | `[MUST]` | Run vector similarity query | Query returns results |
| 04 | Cron job polls and processes new events | `[MUST]` | Insert test event → wait for cron | Event processed; bad rows handled |

### EP2-02: Recommendation / Personalization Service v1 (P2-E2 · PRD B3, B6)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 05 | FastAPI service deployed on Render (2nd free service) | `[MUST]` | `GET /health` | 200 OK; reachable from NestJS |
| 06 | Taste embedding initialized from onboarding seed (pgvector) | `[MUST]` | New user → check embedding table | Non-zero embedding exists post-onboarding |
| 07 | Contrastive pair generation (safe vs. exploratory) | `[MUST]` | Request pair for user | Two tracks returned; differ on ≥1 axis |
| 08 | Both candidates playable and not recently played | `[MUST]` | Check candidates against user history | Neither track in recent-play window |
| 09 | Online pairwise update shifts embedding (via cron) | `[MUST]` | Submit choice → wait for cron → re-query embedding | Embedding vector changed measurably |
| 10 | Learned preferences reflected in Home ranking | `[MUST]` | Make several choices → check Home | Home shelf order adapts |
| 11 | Fairness: no single-artist/label over-representation | `[SHOULD]` | Generate 20 pairs for same user | Artists/labels sufficiently diverse |

### EP2-03: Discovery Module & Trigger Engine (P2-E3 · PRD B2)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 12 | `/should-prompt` returns correct decision | `[MUST]` | Query after N songs | Returns `prompt: true` when frequency met |
| 13 | Dynamic N (4–8 songs) between prompts | `[MUST]` | Verify counter in Upstash Redis | Counter respects configured range |
| 14 | Per-hour/session frequency cap enforced | `[MUST]` | Trigger rapidly | Cap blocks excess prompts |
| 15 | Cold-start boost: higher frequency for new users (< 20 interactions) | `[MUST]` | Test with new vs. mature user | New user prompted more frequently |
| 16 | Backoff on dismiss/ignore | `[MUST]` | Dismiss 3 prompts → check frequency | Frequency decreases progressively |
| 17 | Context guards: no prompt during queued album | `[MUST]` | Play a full album in queue | No prompt during album playback |
| 18 | Context guards: no prompt during private session | `[MUST]` | Enable private session → play songs | No prompt appears |
| 19 | Never interrupts explicit user-initiated playback | `[MUST]` | User taps specific song → next boundary | No prompt immediately after explicit play |
| 20 | `promptId` idempotency: double-submit deduped | `[MUST]` | Submit same `promptId` twice | Second submission rejected gracefully |
| 21 | Timeout → `no_choice` recorded | `[MUST]` | Let prompt timeout | Event logged as `no_choice`; queue resumes |
| 22 | `discovery_event` inserted to Postgres on choice | `[MUST]` | Make a choice → check table | Event matches PRD §B5 schema |
| 23 | Counter resets after a choice | `[MUST]` | Choose → check Redis counter | Counter reset to 0 |

### EP2-04: Split-Screen UX (P2-E4 · PRD B4)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 24 | 50/50 split-screen renders < 200 ms | `[MUST]` | Measure render time | < 200 ms; candidate art preloaded |
| 25 | Each side shows: album art, title, artist, "tap to play" | `[MUST]` | Visual inspection | All elements visible on both sides |
| 26 | Clear center divider | `[MUST]` | Visual inspection | Divider is visually distinct |
| 27 | Tap anywhere on a side → instant playback | `[MUST]` | Click on each side | Chosen track plays immediately |
| 28 | Chosen side expand animation (smooth transition) | `[MUST]` | Make a choice | Chosen side expands smoothly to full player |
| 29 | Unchosen track recorded as "rejected in this context" | `[MUST]` | Check event after choice | `rejected_track_id` populated |
| 30 | "Skip both / Not now" control visible but low-emphasis | `[MUST]` | Visual inspection | Control present; not visually dominant |
| 31 | Dismiss resumes normal queue | `[MUST]` | Click "Not now" | Next queued track plays |
| 32 | Hover audio preview (5–10 s) when enabled | `[SHOULD]` | Enable previews → hover | Preview audio plays; stops on leave |
| 33 | Preview disabled by default | `[MUST]` | Fresh account → trigger prompt | No preview on hover |
| 34 | Keyboard: ←/→ to choose, Esc to dismiss | `[MUST]` | Use keyboard shortcuts | Correct behavior |
| 35 | Screen-reader labels (ARIA) | `[MUST]` | Screen reader test | Both options announced; dismiss accessible |
| 36 | Sufficient contrast (WCAG 2.1 AA) | `[MUST]` | Contrast checker | All text meets 4.5:1 ratio |
| 37 | Reduced-motion mode disables animations | `[SHOULD]` | Enable `prefers-reduced-motion` | Animations disabled; functionality intact |
| 38 | Decision latency captured client-side | `[MUST]` | Make choice → check event | `latencyMs` field populated |
| 39 | Preview behavior captured | `[MUST]` | Preview → choose → check event | `preview_behavior` JSONB populated |

### EP2-05: Discovery Settings & Privacy (P2-E5 · PRD B7, §6.4)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 40 | Toggle discovery on/off | `[MUST]` | Turn off → play songs | No prompts appear; turn on → prompts resume |
| 41 | Frequency preference (Off / Occasional / Frequent) | `[MUST]` | Set each level → observe frequency | Prompt interval changes accordingly |
| 42 | Enable/disable hover audio previews | `[MUST]` | Toggle → trigger prompt | Previews enabled/disabled per setting |
| 43 | "Reset my discovery profile" | `[MUST]` | Reset → check embedding | Embedding reverts to seed / default |
| 44 | Private session → zero events in Postgres | `[MUST]` | Enable private → make choices → check DB | No discovery events inserted |
| 45 | Consent disclosure on first prompt | `[MUST]` | First prompt for new user | Disclosure shown; opt-out link present |

### EP2-06: Degradation & Analytics (P2-E6 · PRD §6.3, §9)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 46 | Recommendation Service down → heuristic pair or skip | `[MUST]` | Kill Recommendation → trigger prompt | Heuristic pair shown OR prompt skipped; playback unaffected |
| 47 | Recommendation Service down → playback unaffected | `[MUST]` | Kill Recommendation → play music | Normal playback continues |
| 48 | Discovery analytics computable from Postgres | `[MUST]` | Run analytics queries | shown/engaged/dismissed/timeout counts correct |
| 49 | Engagement rate computable | `[MUST]` | Verify formula | `engaged / shown` ratio correct |
| 50 | Downstream engagement backfilled | `[MUST]` | Choose → finish/skip/save → check event row | Downstream fields populated |

## 2.3 Non-Functional Evaluation

| # | Criteria | Type | Target | Test Method |
|---|---|---|---|---|
| 51 | Split-screen render latency | `[MUST]` | < 200 ms | FE performance test |
| 52 | pgvector query latency | `[MUST]` | < 100 ms | API test |
| 53 | Playback handoff after choice | `[MUST]` | < 500 ms to first audio | Measure from click to audio |
| 54 | Recommendation Service cold-start | `[SHOULD]` | < 10 s (Render free tier) | Measure after idle |
| 55 | Upstash Redis usage within free tier | `[MUST]` | < 10K commands/day | Monitor Upstash dashboard |

## 2.4 Architecture Evaluation

| # | Criteria | Pass Condition |
|---|---|---|
| 56 | Recommendation Service deployed as separate Render service | Second Render free-tier web service |
| 57 | Discovery Module exists in NestJS monolith | Distinct module with own controllers/services |
| 58 | Events stored in Postgres tables (not Kafka) | `discovery_events` and `playback_events` tables verified |
| 59 | Embeddings stored in pgvector (not separate Feature Store) | `user_embeddings` and `track_features` with vector columns |
| 60 | Trigger engine state in Upstash Redis | `disc:counter`, `disc:backoff`, `disc:coldstart` keys verified |
| 61 | Cron job processes events (not stream processor) | Render cron / scheduled task operational |
| 62 | No paid services introduced | Verify $0 infrastructure cost |

## 2.5 KPI Gate

| Metric | Target | Measurement Method |
|---|---|---|
| Discovery prompt engagement rate | ≥ 60% (instrumented, tracking) | Postgres analytics query |
| Prompt dismissal / annoyance rate | ≤ 10% | Postgres analytics query |
| Taste embedding updates | Verified working | Automated test |
| Candidate pairs reflect learned preferences | Qualitative review | Manual inspection |
| Home reflects discovery signals | Verified | Before/after comparison |

## 2.6 Regression Scope

- **Phase 1 full regression:** Auth, playback, search (Postgres FTS), library, playlists, Home (heuristic), artist/album pages
- **Phase 0:** CI/CD, hosting — spot check

## 2.7 Sign-Off Checklist

- [ ] All `[MUST]` criteria in EP2-01 through EP2-06 pass
- [ ] Full discovery loop working end-to-end
- [ ] Embedding updates via cron verified
- [ ] Graceful degradation tested (Recommendation Service down)
- [ ] Privacy: zero events in private session
- [ ] Idempotency + timeout edge cases verified
- [ ] Engagement metrics computable from Postgres
- [ ] Upstash Redis within free-tier limits
- [ ] Phase 1 regression passed
- [ ] No open P0/P1 bugs

---

# PHASE 3 — Personalization Depth

> **Duration:** ~3 sprints (6 weeks) · **Sprints:** S10–S12
> **PRD Mapping:** B3 (richer candidates), B6 (full learning loop — contextual), B8 (Discovery Recap/Insights), A3/A5 (Made-for-You mixes, discovery-informed Home)
> **Architecture Mapping:** Cron-based batch retraining; contextual modeling in Recommendation Service; materialized mixes in Postgres; Redis-cached Home

## 3.1 Phase Summary

Deepen ML with context (mood/activity/time), add cron-based batch retraining, generate Made-for-You mixes, ship Discovery Recap, and demonstrate measurable relevance lift. All on free infrastructure.

## 3.2 Functional Evaluation

### EP3-01: Batch Retraining — Cron-Based (P3-E1 · PRD B6)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 01 | Nightly cron job retrains model over full event history | `[MUST]` | Trigger job; verify new embeddings | New embeddings written; version incremented |
| 02 | Model versioning in Postgres | `[MUST]` | Query versions table | Versions, metrics, timestamps visible |
| 03 | Metric comparison before promoting new model | `[MUST]` | Deploy worse model → check | Promotion blocked when metrics regress |
| 04 | Can rollback to previous model version | `[MUST]` | Rollback → verify serving | Old embeddings restored |
| 05 | Cron job completes within Render free-tier limits | `[MUST]` | Monitor job runtime | Completes without timeout |

### EP3-02: Contextual Model (P3-E2 · PRD B3, B6)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 06 | Context vector (mood/activity/time) computed from recent behavior | `[MUST]` | Play different moods → check pgvector | `context_vector` changes |
| 07 | Context-aware candidate selection | `[MUST]` | User in "calm" context → request pair | Candidates appropriate to calm context |
| 08 | Context-aware ranking shifts with inferred context | `[MUST]` | Compare rankings in different contexts | Different rank orders |
| 09 | Exploration/exploitation parameters tunable | `[MUST]` | Adjust params → observe pair changes | More/less exploratory candidates |

### EP3-03: Made-for-You Mixes & Personalized Home (P3-E3 · PRD A3, A5)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 10 | Daily Mixes / Discover-Weekly generated per-user nightly | `[MUST]` | Check after cron run | Mixes exist; tracks personalized |
| 11 | Mixes reflect learned discovery preferences | `[MUST]` | User with strong preferences → inspect mix | Genres/artists align with discovery history |
| 12 | `/mixes/made-for-you` serves materialized mixes | `[MUST]` | `GET /mixes/made-for-you` | Returns personalized mixes |
| 13 | Home served from Redis cache | `[MUST]` | Check response headers / source | Served from Upstash cache |
| 14 | Home falls back to heuristic when cache miss | `[MUST]` | Flush Redis → load Home | Heuristic Home loads; no error |
| 15 | Home integrates ML-ranked shelves | `[MUST]` | Compare Home before/after ML | ML-driven shelves appear |

### EP3-04: Insights / Discovery Recap (P3-E4 · PRD B8)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 16 | Recap shows mood trends over time | `[MUST]` | User with history → view recap | Mood trend visualization rendered |
| 17 | Recap shows top new artists discovered | `[MUST]` | View recap | Artists listed from discovery choices |
| 18 | Recap shows taste-shift deltas | `[SHOULD]` | View recap | Preference evolution visualized |
| 19 | "Because you chose X over Y" explainability | `[MUST]` | Check recommendation rationale | Rationale stored and surfaced in UI |
| 20 | Recap per-user (no cross-user leakage) | `[MUST]` | Check two different users | Each sees own data only |

### EP3-05: Experimentation Framework (P3-E5 · PRD §9)

| # | Criteria | Type | Test Method | Pass Condition |
|---|---|---|---|---|
| 21 | Cohort assignment (discovery-active vs. control) | `[MUST]` | Assign users → verify stickiness | Deterministic, consistent |
| 22 | Relevance-lift query | `[MUST]` | Run query | Save/skip ratio per cohort displayed |
| 23 | ≥ 15% relevance lift demonstrated | `[MUST]` | Read results | Measurable lift in discovery-active cohort |

## 3.3 Non-Functional Evaluation

| # | Criteria | Type | Target | Test Method |
|---|---|---|---|---|
| 24 | Batch cron job completes in time | `[MUST]` | Within Render free-tier timeout | Monitor job |
| 25 | Recommendation Service latency | `[MUST]` | < 200 ms P95 for ranking calls | API test |
| 26 | Home from Redis cache latency | `[MUST]` | < 500 ms | Performance test |
| 27 | Postgres storage within free-tier limits | `[MUST]` | < 1 GB (Render) / 500 MB (Supabase) | Monitor dashboard |

## 3.4 Architecture Evaluation

| # | Criteria | Pass Condition |
|---|---|---|
| 28 | Batch retraining runs as Render cron job | Cron scheduled and executing |
| 29 | Contextual model runs within Recommendation Service | No additional service deployed |
| 30 | Mixes materialized in Postgres | `user_mixes` table with per-user playlists |
| 31 | Home cached in Upstash Redis | `home:{userId}` keys with TTL |
| 32 | Insights computed from Postgres queries | No separate analytics service |
| 33 | No paid services introduced | Verify $0 infrastructure cost |

## 3.5 KPI Gate — MVP Final

| Metric | Target | Source |
|---|---|---|
| Relevance lift (discovery-active vs. control) | ≥ 15% save/skip improvement | Postgres analytics |
| Made-for-You mixes generated | 100% of active users | Cron job monitoring |
| Discovery Recap renders correctly | 100% for users with ≥ 20 interactions | QA testing |
| Cold-start: meaningful recs within | < 20 discovery interactions | Metric tracking |
| Discovery prompt engagement rate | ≥ 60% | Postgres analytics |
| Prompt dismissal / annoyance rate | ≤ 10% | Postgres analytics |
| Time-to-audio (TTA) | < 500 ms P95 | Performance test |
| Home render | < 2 s P95 | Performance test |

## 3.6 Regression Scope

- **Phase 2 full regression:** All discovery functionality, trigger engine, events, privacy
- **Phase 1 full regression:** Core streaming, auth, library, search (Postgres FTS), playback
- **Phase 0:** CI/CD, hosting — spot check

## 3.7 Sign-Off Checklist

- [ ] All `[MUST]` criteria in EP3-01 through EP3-05 pass
- [ ] ≥ 15% relevance lift demonstrated
- [ ] Batch retraining cron operational
- [ ] Model rollback tested and working
- [ ] Context-aware recommendations live
- [ ] Made-for-You mixes materialized for all active users
- [ ] Discovery Recap shipped and rendering
- [ ] Experimentation framework + cohorts operational
- [ ] All free-tier limits within bounds (Postgres, Redis, Render)
- [ ] Phase 1 + Phase 2 regression passed
- [ ] No open P0/P1 bugs
- [ ] **MVP feature-complete**

---

## Appendix A: Evaluation Traceability Matrix (MVP)

| PRD Feature | Eval Phase | Eval Section(s) | MVP? |
|---|---|---|---|
| A1 Auth & Onboarding | Phase 1 | EP1-01 | ✅ |
| A2 Playback / Player | Phase 1 | EP1-03 | ✅ |
| A3 Search (Postgres FTS) | Phase 1 | EP1-05 | ✅ |
| A4 Library & Playlists | Phase 1 | EP1-04 | ✅ |
| A5 Personalized Home (heuristic) | Phase 1 | EP1-06 | ✅ |
| A5 Personalized Home (ML) | Phase 3 | EP3-03 | ✅ |
| A6 Artist/Album Pages | Phase 1 | EP1-02 | ✅ |
| A7 Podcasts | — | — | ❌ Post-MVP |
| A8 Social / Blend | — | — | ❌ Post-MVP |
| A9 Offline/Downloads | — | — | ❌ Post-MVP |
| A10 Connect/Multi-Device | — | — | ❌ Post-MVP |
| A11 Settings (base) | Phase 1 | EP1-06 | ✅ |
| A11 Settings (discovery) | Phase 2 | EP2-05 | ✅ |
| A12 Monetization | — | — | ❌ Post-MVP |
| A13 Notifications | — | — | ❌ Post-MVP |
| B1–B5 Discovery UX + capture | Phase 2 | EP2-03, EP2-04 | ✅ |
| B6 Learning loop (basic) | Phase 2 | EP2-02 | ✅ |
| B6 Learning loop (deep) | Phase 3 | EP3-01, EP3-02 | ✅ |
| B7 Discovery settings | Phase 2 | EP2-05 | ✅ |
| B8 Discovery Recap | Phase 3 | EP3-04 | ✅ |

---

## Appendix B: Risk-Based Evaluation Priorities (MVP)

| Risk | Extra Eval Focus | Phase |
|---|---|---|
| Discovery feels intrusive | Trigger frequency/backoff matrix testing | 2 |
| Cold-start recommendations poor | Test first-20-interactions quality; heuristic fallback | 1–3 |
| Recommendation Service outage | Kill service; verify graceful degradation | 2 |
| Privacy / behavioral tracking | Zero-event tests in private session | 2 |
| Sparse single-choice signal | Passive signal blending verification | 2–3 |
| Split-screen render latency | Render timing on Vercel | 2 |
| Render free-tier cold starts | Measure latency after idle; keep-alive strategy | 1–3 |
| Upstash Redis free-tier limits | Monitor daily command count | 2–3 |
| Postgres free-tier storage limits | Monitor DB size; prune strategy | 2–3 |

---

## Appendix C: Test Tooling Recommendations (MVP)

| Category | Recommended Tool | Used From |
|---|---|---|
| E2E / UI | Playwright | Phase 1 |
| API / Integration | Jest + Supertest (NestJS) or pytest (FastAPI) | Phase 0 |
| Performance | Lighthouse + manual timing | Phase 1 |
| Accessibility | axe-core + Lighthouse | Phase 1 |
| Security (SAST) | GitHub Dependabot (free) | Phase 0 |
| CI | GitHub Actions (free) | Phase 0 |
| Monitoring | Render logs + Upstash dashboard + Supabase dashboard | Phase 0 |

---

*End of Document*
