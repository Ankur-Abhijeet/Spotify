# Implementation Plan
## Personifier — A Spotify Clone with Adaptive Discovery (MVP)

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 (MVP) |
| **Date** | 2026-07-06 |
| **Companion Docs** | [Product_requirement.md](Product_requirement.md) · [Architecture.md](Architecture.md) |
| **Planning Model** | Phase → Epic → Workstream → Task, delivered in 2-week sprints |
| **Estimation Unit** | Story Points (SP); 1 SP ≈ ½ engineer-day |
| **Infrastructure** | **Free tier only** — Vercel, Render, Upstash Redis, Render/Supabase Postgres |

> **⚠️ MVP Scope:** This is the **MVP delivery plan** (~8–10 weeks, small team, $0 infrastructure). It covers **Phases 0–3** (Foundation + Core Streaming + Adaptive Discovery + Personalization) using entirely free hosting. Features requiring paid infrastructure (billing, ads, DRM, Connect, podcasts, social, Kafka, K8s, multi-region) are deferred to **post-MVP**. See §8 for the graduation path.

---

## 0. How to Read This Document

This plan turns the **4 MVP phases** (PRD §10 / Architecture) into an executable engineering roadmap. Phase 0 (Foundation) covers repo, hosting, and CI/CD bootstrapping.

Structure per phase:
- **Objective & Definition of Done (DoD)**
- **Epics** (with IDs like `P1-E1`)
- **Task breakdown** per epic (IDs like `P1-E1-T3`), each with estimate, dependencies, and acceptance criteria
- **Sprint plan** (which epics land in which sprint)
- **Testing & QA focus**
- **Exit gate** (what must be true to start the next phase)

**Conventions**
- Task IDs: `P{phase}-E{epic}-T{task}`.
- Priority: `P0` = blocker/critical path, `P1` = core, `P2` = important, `P3` = nice-to-have.
- Estimates are planning-level; refine at sprint grooming.
- "FE" = frontend, "BE" = backend, "ML" = data/ML, "QA" = quality.

---

## 1. Team, Roles & Ways of Working

### 1.1 Suggested Team (MVP — small)
| Role | P0–1 | P2–3 |
|---|---|---|
| Tech Lead / Architect | 1 | 1 |
| Backend Engineers | 1–2 | 2 |
| Frontend Engineers | 1–2 | 2 |
| ML / Data Engineers | 0 | 1 |
| QA / SDET | 1 (shared) | 1 |
| Product / Design | 1 + 1 | 1 + 1 |

### 1.2 Cadence
- **2-week sprints**, sprint review + retro, mid-sprint check-in.
- Backlog groomed one sprint ahead; DoD enforced per task.
- Trunk-based development with short-lived feature branches + PR review.

### 1.3 Definition of Done (global, applies to every task)
- Code reviewed + merged; unit tests written and passing.
- Meets acceptance criteria; no P0/P1 bugs open.
- Instrumented (logs where relevant).
- Docs/API contract updated; feature-flagged if user-facing and risky.

---

## 2. Locked Technology Decisions (MVP — Free Tier)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (React, TypeScript), Zustand, Tailwind | Web Audio API + HLS.js for playback. **Vercel free tier.** |
| Backend | NestJS (Node/TS) modular monolith | Single language w/ FE eases hiring. **Render free tier.** |
| ML service | Python (FastAPI) | Recommendation/Personalization from Phase 2. **Render free tier (2nd service).** |
| Primary DB | PostgreSQL (+ `pgvector`) | System of record + embeddings + event store. **Render/Supabase free tier.** |
| Search | PostgreSQL full-text search (`tsvector`) | No Elasticsearch — free, built-in. |
| Cache/State | Upstash Redis (free tier) | Sessions, queue, trigger counters, cache. |
| Event pipeline | Postgres event tables + cron polling | No Kafka — free, sufficient for MVP. |
| Image storage | Cloudinary or Supabase Storage (free tier) | Album art, playlist covers. |
| Streaming | Direct audio URLs from catalog API | No CDN, no DRM, no signed URLs for MVP. |
| CI/CD | GitHub Actions | Build/test/lint on PR; auto-deploy via Vercel/Render. |
| Observability | Render logs + health endpoints | No Prometheus/Grafana — use free Render logging. |

> **Music catalog source** (decision needed): Spotify Web API (metadata + 30s previews), Jamendo (full CC tracks), or another free source. Does not block Phase 0.

---

# PHASE 0 — Foundation & Enablement
*Duration: ~1 sprint (2 weeks)*

### Objective
Stand up everything needed to build safely and ship continuously **before** feature work starts. Nothing user-facing.

### DoD
A developer can clone the repo, run the full stack locally, open a PR, and have it auto-tested and deployed to Vercel (FE) + Render (BE).

### Epics & Tasks

**P0-E1 — Repository & Project Scaffolding** *(P0)*
| Task | Desc | Est | Deps |
|---|---|---|---|
| P0-E1-T1 | Monorepo setup (FE `apps/web`, BE `apps/api`, shared `packages/*`) | 3 | — |
| P0-E1-T2 | Lint/format/commit hooks, TS config, code-owners | 2 | T1 |
| P0-E1-T3 | Env config strategy (.env schema, local + Render + Vercel) | 2 | T1 |

**P0-E2 — Hosting & Database Setup** *(P0)*
| Task | Desc | Est | Deps |
|---|---|---|---|
| P0-E2-T1 | Vercel project: connect repo, auto-deploy `apps/web` | 2 | P0-E1 |
| P0-E2-T2 | Render web service: deploy `apps/api`, configure env vars | 3 | P0-E1 |
| P0-E2-T3 | Render/Supabase Postgres: provision free instance, initial migrations | 3 | T2 |
| P0-E2-T4 | Upstash Redis: provision free instance, configure connection | 2 | T2 |
| P0-E2-T5 | Cloudinary/Supabase Storage: set up free-tier image bucket | 2 | — |

**P0-E3 — CI/CD Pipeline** *(P0)*
| Task | Desc | Est | Deps |
|---|---|---|---|
| P0-E3-T1 | GitHub Actions: build, test, lint on PR | 3 | P0-E1 |
| P0-E3-T2 | Vercel auto-deploy on merge (preview on PR) | 1 | P0-E2-T1 |
| P0-E3-T3 | Render auto-deploy on merge | 1 | P0-E2-T2 |

**P0-E4 — Health & Logging** *(P1)*
| Task | Desc | Est | Deps |
|---|---|---|---|
| P0-E4-T1 | Health/readiness endpoints in NestJS | 1 | P0-E2 |
| P0-E4-T2 | Structured console logging (JSON) | 2 | P0-E2 |

**Sprint plan:** S1 → E1, E2, E3, E4.
**Exit gate:** Green CI on PR; auto-deploy to Vercel + Render; Postgres + Redis accessible; local dev bootstrap documented.

---

# PHASE 1 — Core Streaming MVP
*Duration: ~4 sprints (8 weeks)*
*Architecture ref: Phase 1 (modular monolith on Render). PRD: A1–A6.*

### Objective
A user can sign up, browse/search the catalog, build a library and playlists, and play music end-to-end with < 500 ms time-to-audio.

### DoD (Phase Exit Gate)
All P0/P1 epics shipped to Render/Vercel, E2E "signup → search → play → save → playlist" passes, performance targets met, no open P0/P1 bugs.

### Epics

**P1-E1 — Auth & Onboarding** *(P0 · PRD A1)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E1-T1 | Email signup/login, JWT access+refresh, sessions (Upstash Redis) | 5 | Tokens rotate; refresh works; invalid creds rejected |
| P1-E1-T2 | OAuth (Google/Apple/Facebook) via OIDC | 8 | All 3 providers log a user in and create account |
| P1-E1-T3 | Email verification + password reset flows | 5 | Verify + reset emails delivered and consumable once |
| P1-E1-T4 | Onboarding: pick 3–5 genres/artists → seed profile | 5 | Selections persisted; feed the heuristic Home |

**P1-E2 — Catalog Ingestion & Read APIs** *(P0 · PRD A6)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E2-T1 | Catalog schema (tracks/artists/albums) + migrations + `tsvector` columns | 5 | Tables + indexes; FTS index present; `audio_features` JSONB |
| P1-E2-T2 | Ingestion from free music source API | 8 | Batch import populates catalog; images to Cloudinary/Supabase |
| P1-E2-T3 | Read APIs: track/album/artist detail | 5 | Endpoints return full metadata < 200 ms |
| P1-E2-T4 | Artist page data (top tracks, discography, related) | 5 | Artist payload complete; related-artists heuristic |

**P1-E3 — Streaming & Core Player** *(P0 · PRD A2)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E3-T1 | Audio URL resolution from catalog source | 5 | Returns playable audio URL; unauthorized blocked |
| P1-E3-T2 | Playback session + queue state in Upstash Redis | 5 | Queue survives refresh; resume position persists |
| P1-E3-T3 | FE player: play/pause/seek/volume/next/prev | 8 | All controls work; TTA < 500 ms |
| P1-E3-T4 | Shuffle, repeat modes, persistent bottom bar | 5 | Modes correct; bar persists across routes |
| P1-E3-T5 | Queue UI: view/reorder/add/play-next/clear | 5 | Drag-reorder persists to session |
| P1-E3-T6 | Crossfade/gapless + audio-quality selection | 5 | Settings-controlled; no audible gap when enabled |
| P1-E3-T7 | Full-screen Now Playing (art, up-next; lyrics stub) | 3 | Renders; lyrics placeholder wired for later |

**P1-E4 — Library & Playlists** *(P0 · PRD A4)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E4-T1 | Liked Songs + save/follow albums/artists | 5 | Like/unlike idempotent; library lists them |
| P1-E4-T2 | Playlist CRUD + add/remove/reorder tracks | 8 | Full CRUD; drag-drop ordering persists |
| P1-E4-T3 | Collaborative + public/private playlist flags | 3 | Flags enforced on read/write |
| P1-E4-T4 | Playlist cover upload + description | 3 | Image stored/served via Cloudinary/Supabase |
| P1-E4-T5 | Library filter/sort (recent/alpha/creator) | 3 | Sort/filter correct and fast |

**P1-E5 — Search (Postgres FTS)** *(P1 · PRD A3 basic)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E5-T1 | `tsvector` index + GIN indexes on catalog tables | 3 | Index stays in sync on catalog changes (trigger/function) |
| P1-E5-T2 | Universal search API (track/artist/album/playlist) using `ts_rank` | 5 | Relevant results < 300 ms |
| P1-E5-T3 | Search-as-you-type + recent searches (FE) | 5 | Debounced; recents persisted per user |
| P1-E5-T4 | Browse hubs (genre/mood/category) + charts | 5 | Static/heuristic hubs render |

**P1-E6 — Heuristic Home & Settings** *(P1 · PRD A5, A11 base)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P1-E6-T1 | Home assembly: recently-played, popular, seeded | 5 | Shelves populate from seed + history |
| P1-E6-T2 | Time-of-day aware shelf ordering | 3 | Morning/evening variants differ |
| P1-E6-T3 | Settings: profile, playback prefs, theme, language | 5 | Persist + apply live |

### Phase 1 Sprint Plan
| Sprint | Focus |
|---|---|
| S2 | P1-E1 (Auth), P1-E2 start (catalog schema + ingestion) |
| S3 | P1-E2 finish, P1-E3 start (streaming + player core) |
| S4 | P1-E3 finish (player polish, queue, crossfade) |
| S5 | P1-E4 (library/playlists), P1-E5 (search — Postgres FTS) |
|    | P1-E6 (Home + settings), hardening + E2E |

### Phase 1 Testing Focus
- Unit + integration on auth, playback session, playlist CRUD.
- E2E happy path (Playwright): signup → search → play → like → playlist.
- Performance: TTA < 500 ms, Home < 2 s P95.
- Security: token rotation, authz on playlist edits.

### Phase 1 Exit Gate
E2E green on Render/Vercel; performance SLOs met; heuristic Home live; deployable via GitHub auto-deploy.

---

# PHASE 2 — Adaptive Discovery v1
*Duration: ~4 sprints (8 weeks)*
*Architecture ref: Phase 2 (Postgres events + Recommendation Service). PRD: B1–B7.*

### Objective
Ship the split-screen A/B prompt, capture every choice as a structured event in Postgres, deploy the Recommendation Service (FastAPI on Render), and close a basic online pairwise learning loop that influences candidate pairs and Home.

### DoD (Phase Exit Gate)
Prompt appears per trigger rules; choices captured to Postgres; taste embedding updates via cron; degradation path verified; discovery settings functional; engagement instrumentation live (target ≥ 60%).

### Epics

**P2-E1 — Postgres Event Pipeline & pgvector** *(P0)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E1-T1 | `discovery_events` + `playback_events` tables + indexes | 3 | Tables live; JSONB columns for flexible schema |
| P2-E1-T2 | Emit `playback_events` from monolith (play/skip/save/finish) | 5 | Events INSERT reliably on each action |
| P2-E1-T3 | Enable pgvector extension + `user_embeddings` / `track_features` tables | 5 | Vector columns created; similarity queries work |
| P2-E1-T4 | Cron job skeleton: poll new events, validate, process | 5 | Cron runs on schedule; dead-letter bad rows |

**P2-E2 — Recommendation/Personalization Service (v1)** *(P0 · PRD B3, B6)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E2-T1 | FastAPI service scaffold on Render (2nd free service) | 3 | Health/ready; deployed and reachable from NestJS |
| P2-E2-T2 | Taste embedding init from onboarding seed (pgvector) | 5 | Every user has an embedding post-onboarding |
| P2-E2-T3 | Contrastive candidate-pair generator (safe vs. exploratory) | 8 | Pair differs on ≥1 axis; both playable, not recent |
| P2-E2-T4 | Online pairwise update (Bradley–Terry/embedding nudge) via cron | 8 | Choice event shifts embedding measurably |
| P2-E2-T5 | Feed learned prefs into Home ranking | 5 | Home reorders after discovery choices |

**P2-E3 — Discovery Module & Trigger Engine** *(P0 · PRD B2)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E3-T1 | Discovery module in NestJS + `/should-prompt` | 5 | Returns decision + reason |
| P2-E3-T2 | Trigger engine: dynamic N (4–8), frequency cap (Upstash Redis) | 5 | Counter in Redis; respects cap per hour/session |
| P2-E3-T3 | Cold-start boost + backoff-on-ignore logic | 5 | Higher freq first ~20; backs off on dismiss/ignore |
| P2-E3-T4 | Context guards (queued album/private/sleep timer) | 5 | Never prompts in guarded contexts |
| P2-E3-T5 | `/pair` + `/choice` endpoints w/ `promptId` idempotency | 5 | Double-submit deduped; late choice → `no_choice` |
| P2-E3-T6 | INSERT `discovery_event` + reset counter on choice | 3 | Event matches PRD §B5 schema |

**P2-E4 — Split-Screen UX (Frontend)** *(P0 · PRD B4)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E4-T1 | 50/50 split-screen component + center divider | 5 | Renders < 200 ms; art preloaded |
| P2-E4-T2 | Tap-anywhere-to-choose + chosen-side expand transition | 5 | Instant playback on click; smooth expand |
| P2-E4-T3 | Optional hover audio preview (configurable, default off) | 5 | 5–10 s preview on hover when enabled |
| P2-E4-T4 | "Skip both / Not now" + timeout auto-resume | 3 | Dismiss + timeout resume queue; log outcome |
| P2-E4-T5 | Accessibility (←/→ choose, Esc dismiss, ARIA, contrast) | 5 | Keyboard + SR fully operable; reduced-motion respected |
| P2-E4-T6 | Capture decision latency + preview behavior client-side | 3 | Sent with `/choice` payload |

**P2-E5 — Discovery Settings & Privacy** *(P1 · PRD B7, §6.4)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E5-T1 | Settings: on/off, frequency pref, previews toggle | 3 | Persist + immediately affect trigger engine |
| P2-E5-T2 | "Reset discovery profile" | 3 | Clears learned discovery signals (resets pgvector embedding) |
| P2-E5-T3 | Private-session short-circuit (no event inserted) | 5 | Zero events in Postgres for private sessions |
| P2-E5-T4 | Consent + disclosure copy for behavioral tracking | 2 | Shown on first prompt; opt-out honored |

**P2-E6 — Degradation & Discovery Analytics** *(P1 · PRD §6.3, §9)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P2-E6-T1 | Graceful degradation: reco down → heuristic pair or skip | 5 | Playback never blocks when reco is down |
| P2-E6-T2 | Discovery analytics: query-based dashboard (shown/engaged/dismissed/timeout) | 5 | Engagement rate computable from Postgres |
| P2-E6-T3 | Downstream-engagement backfill onto choice event | 5 | finish/skip/save attached to the discovery event row |

### Phase 2 Sprint Plan
| Sprint | Focus |
|---|---|
| S6 | P2-E1 (event tables + pgvector), P2-E2 start (reco scaffold + embedding) |
| S7 | P2-E2 (candidate gen + online update), P2-E3 start (trigger engine) |
| S8 | P2-E3 finish (endpoints, context guards), P2-E4 start (split-screen) |
| S9 | P2-E4 finish (a11y, previews), P2-E5 (settings/privacy), P2-E6 (degradation + analytics) |

### Phase 2 Testing Focus
- Contract tests NestJS ↔ Recommendation Service (HTTP).
- Trigger-engine unit tests (frequency, cap, cold-start, backoff, context guards).
- Idempotency/timeout edge cases on `/choice`.
- Kill Recommendation Service → verify degradation.
- Privacy: assert zero events in private session.

### Phase 2 Exit Gate
Full discovery loop working; embedding updates via cron; degradation + privacy verified; engagement metrics computable from Postgres.

---

# PHASE 3 — Personalization Depth
*Duration: ~3 sprints (6 weeks)*
*Architecture ref: Phase 3 (cron-based batch + contextual modeling). PRD: B3, B6, B8, A3/A5 ML.*

### Objective
Add context (mood/activity/time) modeling, cron-based batch retraining, Made-for-You mixes, and the Discovery Recap. Achieve measurable relevance lift.

### DoD (Phase Exit Gate)
Context-aware recs live; batch retraining operational; mixes materialized; Recap shipped; ≥ 15% relevance lift in discovery-active cohort vs. control.

### Epics

**P3-E1 — Batch Retraining (Cron-Based)** *(P0 · PRD B6)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P3-E1-T1 | Nightly cron job: retrain ranking model over full event history in Postgres | 8 | Job completes within Render free-tier limits |
| P3-E1-T2 | Model versioning: track version + metrics in Postgres | 3 | Versions tracked; can rollback to prior version |
| P3-E1-T3 | Compare new vs. old model metrics before promoting | 5 | Skip-rate↑ / save-rate↓ prevents promotion |

**P3-E2 — Contextual Model** *(P0 · PRD B3, B6)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P3-E2-T1 | Context vector (mood/activity/time) from recent behavior | 8 | `context_vector` in pgvector updated per session |
| P3-E2-T2 | Context-aware candidate selection + ranking | 8 | Pairs/ranking shift with inferred context |
| P3-E2-T3 | Exploration/exploitation tuning (bandit params) | 5 | Tunable; measurable impact |

**P3-E3 — Made-for-You Mixes & Personalized Home** *(P1 · PRD A3, A5)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P3-E3-T1 | Mix Generation cron (Daily Mixes/Discover-Weekly) | 8 | Per-user mixes materialized in Postgres nightly |
| P3-E3-T2 | Redis-cached personalized Home | 5 | Home served from Upstash cache; heuristic fallback |
| P3-E3-T3 | `/mixes/made-for-you` + Home ML integration | 5 | Endpoints serve materialized personalized feeds |

**P3-E4 — Insights / Discovery Recap** *(P2 · PRD B8)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P3-E4-T1 | Insights queries: aggregate discovery history | 5 | Mood trends, top new artists, taste-shift deltas |
| P3-E4-T2 | Recap UI (periodic) | 5 | Renders per-user recap payload |
| P3-E4-T3 | Explainability: "Because you chose X over Y" | 3 | Rationale stored + surfaced in UI |

**P3-E5 — Experimentation Framework** *(P1 · PRD §9)*
| Task | Desc | Est | Accept. Criteria |
|---|---|---|---|
| P3-E5-T1 | Cohort assignment (discovery-active vs. control) | 5 | Deterministic, sticky assignment |
| P3-E5-T2 | Relevance-lift query (save/skip ratio per cohort) | 5 | Lift computed from Postgres analytics |

### Phase 3 Sprint Plan
| Sprint | Focus |
|---|---|
| S10 | P3-E1 (batch retraining cron), P3-E2 start (context vector) |
| S11 | P3-E2 finish (context ranking + tuning), P3-E3 (mixes + personalized Home) |
| S12 | P3-E4 (Recap), P3-E5 (experimentation), validate lift |

### Phase 3 Testing Focus
- Model comparison: new vs. old before promoting.
- Cohort integrity + lift-measurement correctness.
- Cron job reliability on Render free tier.

### Phase 3 Exit Gate
≥ 15% relevance lift demonstrated; batch retraining operational; mixes + Recap live.

---

## 3. Master Timeline (MVP)

| Phase | Sprints | ~Weeks | Cumulative |
|---|---|---|---|
| P0 Foundation | S1 | 2 | Wk 2 |
| P1 Core MVP | S2–S5 | 8 | Wk 10 |
| P2 Adaptive Discovery | S6–S9 | 8 | Wk 18 |
| P3 Personalization | S10–S12 | 6 | Wk 24 |

> **~24 weeks (~6 months)** with the small team in §1.1. With more parallelization or a slightly larger team, this can compress to ~16–18 weeks. Phases 2 and 3 can partially overlap once the ML engineer joins.

---

## 4. Cross-Cutting Workstreams (run every phase)

| Workstream | Ongoing Practice |
|---|---|
| **Testing/QA** | Unit + integration per task; E2E per phase; performance checks |
| **Security** | Dependency scans in CI; authz reviews; no secrets in code |
| **Observability** | Structured logging; health endpoints; Render logs |
| **Accessibility** | WCAG 2.1 AA checks per FE task; audit before each phase exit |
| **Docs** | API contracts, READMEs kept current; onboarding guide |
| **Feature flags** | All risky user-facing features flagged; gradual rollout |

---

## 5. Dependencies & Critical Path

```
P0 Foundation ──► P1 Core MVP ──► P2 Discovery ──► P3 Personalization
                       │                │
                       │                └── Postgres events ──► needed by P3 batch
                       └── catalog source API (blocks P1-E2)
```

**Critical path:** P0 → P1 (auth + catalog + streaming) → P2 (Postgres events + reco service) → P3 (batch/context).

**Key external dependency:**
- Free music catalog/streaming source API (blocks P1-E2). Resolve early — Spotify Web API, Jamendo, or Deezer free API.

---

## 6. Risk Register (MVP-Focused)

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Catalog source API delayed/unavailable | Med | High | Mock catalog + royalty-free stub; parallelize | TL/Product |
| ML lift target (15%) not met | Med | High | Ship blended signals + iterate; treat as tunable | ML Lead |
| Render free-tier cold starts (latency) | High | Med | Keep service warm with health pings; optimize cold start | BE Lead |
| Upstash Redis free-tier limits (10K cmd/day) | Med | Med | Monitor usage; optimize Redis calls; upgrade if needed | BE Lead |
| Postgres free-tier storage/connection limits | Med | Med | Monitor; prune old events; connection pooling | BE Lead |
| Discovery feels intrusive (KPI miss) | Med | Med | Backoff/frequency tuning; iterate on trigger params | Product |
| Render/Vercel free-tier downtime | Low | Med | Accept for MVP; document upgrade path | TL |

---

## 7. Environments & Release Strategy
- **Environments:** Vercel preview (auto on PR) + Render auto-deploy on `main`. Single environment for MVP (no separate staging — use Vercel preview deployments for pre-merge testing).
- **Release:** trunk-based, feature-flagged, deploy on merge.
- **Rollback:** Vercel instant rollback; Render redeploy previous commit.

---

## 8. Post-MVP Graduation Path

When the MVP validates product-market fit and the team is ready to scale:

| Free-Tier Component | Graduates To | Trigger |
|---|---|---|
| Render free (BE) | AWS/GCP + Kubernetes | Traffic > free-tier limits; need autoscaling |
| Postgres (Render/Supabase free) | Managed Postgres (RDS/Cloud SQL) | Storage > 1 GB; need read replicas |
| Upstash Redis free | Redis cluster (ElastiCache) | Commands > 10K/day; need pub-sub for realtime |
| Postgres FTS | Elasticsearch / OpenSearch | Catalog > 100K tracks; need advanced search |
| Postgres event tables | Kafka / Kinesis | Event volume > manageable polling; need streaming |
| Cron-based batch | Spark / Flink | Data volume requires distributed compute |
| Cloudinary free | S3 + CloudFront CDN | Image volume / bandwidth limits |
| Direct audio URLs | CDN + signed URLs + DRM | Licensing requires DRM; scale requires CDN |
| No billing | Stripe integration | Monetization ready |
| No social/connect | Social Service + WebSocket infra | Feature demand validated |

---

*End of Document*
