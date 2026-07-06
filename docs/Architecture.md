# Architecture Document
## Personifier — A Spotify Clone with Adaptive Discovery

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 (MVP) |
| **Date** | 2026-07-06 |
| **Companion Doc** | [Product_requirement.md](Product_requirement.md) |
| **Architecture Style** | Modular monolith (MVP); evolves to services post-MVP |
| **Delivery Model** | Phase-wise, each phase ships a deployable increment |
| **Infrastructure** | **Free tier only** — Vercel, Render, Upstash, Supabase/Render Postgres |

> **⚠️ MVP Scope:** This architecture targets a **zero-cost MVP** hosted entirely on free-tier services. Phases 4–5 (social, offline/DRM, billing, ads, Connect, scale) are **deferred to post-MVP** when the product graduates to paid infrastructure. Sections marked **[POST-MVP]** are preserved for reference but not built in the current scope.

---

## 0. How to Read This Document

This document is organized to mirror the **4 MVP release phases** (P0–P3) plus post-MVP phases (P4–P5) defined in the PRD. Rather than describing one giant end-state, it shows how the architecture is **built up incrementally** — each phase adds modules, data stores, and capabilities on top of the previous one without throwing work away.

Each phase section contains:
- **Goal & Scope** — which PRD features land in this phase.
- **Architecture Additions** — new components introduced.
- **Component Diagram** — the system state *at the end of* the phase.
- **Data Stores** — schemas/entities added.
- **Key APIs / Contracts** — the important interfaces.
- **Critical Flows** — sequence-level walkthroughs.
- **Cross-Cutting Concerns** — security, scaling, observability changes.
- **Exit Criteria** — what "done" means for the phase.

A guiding principle: **start as a modular monolith on free hosting, extract services only when a scaling or team boundary demands it.** The entire MVP (Phases 0–3) runs as a well-structured monolith on Render + a lightweight Python recommendation service, with Vercel hosting the frontend.

---

## 1. Architectural Principles

1. **Domain-modular from day one.** Even in the monolith, code is organized by domain (Auth, Catalog, Playback, Library, Discovery) so extraction is cheap later.
2. **Stateless services + externalized state.** All session/queue/real-time state lives in Upstash Redis or Postgres, never in-process, so the service can restart without losing state.
3. **Event-driven for learning.** Discovery and playback telemetry flow through a Postgres event table; the personalization loop consumes via polling/cron, never in the request path.
4. **Graceful degradation.** If personalization is down, playback and Discovery fall back to heuristics — the app never hard-fails on ML.
5. **Single entry point.** The client talks to one backend (NestJS on Render); internal module boundaries are logical, not network hops.
6. **Separate read and write paths for hot data.** Catalog and Home feeds are read-heavy → cached in Redis; writes go through the DB.
7. **Privacy by construction.** Behavioral tracking is opt-out-able; private sessions bypass the event pipeline at the source.
8. **Zero-cost infrastructure.** Every component must run on a free tier. No paid cloud services, no Kubernetes, no Kafka, no Elasticsearch.

---

## 2. Target End-State (MVP Reference Architecture)

This is the full system after Phase 3 (end of MVP). Post-MVP phases add services on top.

```
                                   ┌──────────────────────────────┐
                                   │        Web Client (SPA)       │
                                   │  Next.js · TS · Web Audio API  │
                                   │  HLS.js · Zustand              │
                                   │  ── Hosted on Vercel (free) ── │
                                   └───────────────┬──────────────┘
                                                   │ HTTPS
                                   ┌───────────────▼──────────────┐
                                   │     NestJS Monolith (API)      │
                                   │  Auth · Catalog · Playback ·   │
                                   │  Library · Search · Home ·     │
                                   │  Discovery                     │
                                   │  ── Hosted on Render (free) ── │
                                   └───┬──────────────────────┬───┘
                                       │                      │
              ┌────────────────────────┤                      │
              ▼                        ▼                      ▼
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │   PostgreSQL      │    │  Upstash Redis    │    │ Recommendation   │
    │  (Render/Supabase │    │  (free tier)      │    │ Service (Python/ │
    │   free tier)      │    │  sessions · queue │    │ FastAPI)         │
    │                   │    │  trigger counters  │    │ Hosted on Render │
    │  users · tracks · │    │  cache             │    │ (free)           │
    │  albums · artists │    └──────────────────┘    └────────┬─────────┘
    │  playlists ·      │                                      │ reads
    │  library ·        │                                      │
    │  discovery_events │◄─────────────────────────────────────┘
    │  pgvector embed.  │
    └──────────────────┘

    ┌──────────────────┐
    │  Cloudinary /     │
    │  Supabase Storage │    (album art, playlist covers — free tier)
    │  (free tier)      │
    └──────────────────┘
```

**Legend of shared infra across all MVP phases:** PostgreSQL (system of record + event store + pgvector embeddings), Upstash Redis (sessions/queue/cache/trigger state), Cloudinary/Supabase Storage (images). The Recommendation Service (Python/FastAPI) is the only separately deployed service, added in Phase 2.

---

# PHASE 0 — Foundation & Enablement (MVP)

> **PRD mapping:** Infrastructure prerequisites (not user-facing).
> **Architecture posture:** Vercel (FE) + Render (BE) + GitHub Actions CI/CD. No Kubernetes, no Terraform.

### 0.1 Goal & Scope
Set up the development environment, hosting, and CI/CD pipeline so a developer can clone, run locally, open a PR, and have it auto-tested and deployed to Render/Vercel. Nothing user-facing.

### 0.2 Architecture Additions
| Component | Responsibility |
|---|---|
| **Monorepo** | `apps/web` (Next.js on Vercel), `apps/api` (NestJS on Render), `packages/*` (shared types/utils) |
| **Vercel** | Hosts the Next.js frontend (free tier) |
| **Render** | Hosts the NestJS API (free tier web service) |
| **Render/Supabase Postgres** | Free-tier managed Postgres |
| **Upstash Redis** | Free-tier serverless Redis |
| **GitHub Actions** | CI pipeline (lint, test, build on PR) |
| **Vercel/Render auto-deploy** | CD — auto-deploy on merge to `main` |

### 0.3 Exit Criteria
Developer can clone, run `docker-compose up` locally, push a PR (triggers CI), and merge deploys to Vercel + Render. Postgres and Redis accessible from Render service.

---

# PHASE 1 — Core Streaming MVP

> **PRD mapping:** A1 (Auth & Onboarding), A2 (Playback), A3 (Search — basic), A4 (Library & Playlists), A5 (Personalized Home — heuristic), A6 (Artist/Album pages).
> **Architecture posture:** **Modular monolith** on Render, with audio served directly from catalog API (no CDN/DRM).

### 1.1 Goal & Scope
Ship a usable music streaming app: users can sign up, browse the catalog, search, build a library and playlists, and play music with a full-featured player. No ML yet — Home is rule-based (recently played, popular, seeded genres).

### 1.2 Architecture Additions
| Component | Responsibility |
|---|---|
| **Web Client (Next.js SPA)** | UI, player (Web Audio API + HLS.js), client state (Zustand), routing. Hosted on Vercel. |
| **Auth Module** | Signup/login (email + OAuth: Google/Apple/Facebook), sessions/JWT, password reset, email verification. |
| **Catalog Module** | Read APIs for tracks/albums/artists; catalog ingestion from free music source API. |
| **Playback/Streaming Module** | Resolves audio URLs from catalog API, playback session + queue state (in Redis), resume position. |
| **Library & Playlist Module** | Liked songs, saved albums/artists, CRUD playlists, ordering. |
| **Search Module** | Query API backed by PostgreSQL full-text search (`tsvector` + `ts_rank`). |
| **Home Module** | Heuristic feed assembly (recently played, popular, genre-seeded). |

### 1.3 Component Diagram (End of Phase 1)
```
┌──────────────┐   HTTPS   ┌──────────────────┐
│  Web Client  │──────────►│  NestJS Monolith  │
│  (Vercel)    │           │  (Render free)     │
└──────────────┘           └───────┬────────────┘
                                   │ (in-process module calls)
        ┌──────────┬───────────────┼───────────────┬──────────┐
        ▼          ▼               ▼               ▼          ▼
     ┌──────┐  ┌────────┐    ┌──────────┐    ┌─────────┐ ┌────────┐
     │ Auth │  │Catalog │    │ Playback │    │ Library │ │ Search │
     └───┬──┘  └───┬────┘    └────┬─────┘    └────┬────┘ └───┬────┘
         │         │              │               │          │
         └─────────┴──────┬───────┴───────────────┘          │
                          ▼                                   │ (Postgres
                   ┌─────────────┐                            │  tsvector)
                   │ PostgreSQL  │◄───────────────────────────┘
                   │(Render/Supa)│
                   └─────────────┘
         ┌─────────────┐   ┌────────────────┐
         │Upstash Redis│   │ Cloudinary /    │
         │ session·    │   │ Supabase Store  │
         │ queue·cache │   │ (images)        │
         └─────────────┘   └────────────────┘
```
> The modules above are **one deployable** (the monolith on Render); the boxes denote logical domains, not separate processes.

### 1.4 Data Stores (Entities Introduced)
**PostgreSQL (system of record):**
- `users` (id, email, auth_provider, hashed_password, created_at)
- `user_settings` (user_id, playback prefs, theme, language)
- `tracks` (id, title, artist_id, album_id, duration, audio_features JSONB, streamable, popularity, audio_url)
- `artists` (id, name, bio, image_url, monthly_listeners)
- `albums` (id, title, artist_id, release_date, art_url)
- `playlists` (id, owner_id, title, description, cover_url, is_collaborative, is_public)
- `playlist_tracks` (playlist_id, track_id, position, added_at)
- `library_items` (user_id, item_type, item_id, saved_at)
- `follows` (user_id, target_type, target_id) — artists in P1, users post-MVP
- Full-text search index: `tsvector` columns on tracks, artists, albums with GIN indexes

**Upstash Redis:** `session:{token}`, `queue:{sessionId}`, `nowplaying:{userId}`, hot catalog cache.
**Cloudinary / Supabase Storage:** album/artist/playlist art (free tier).

### 1.5 Key APIs (Representative)
```
POST /auth/signup · POST /auth/login · POST /auth/oauth/{provider} · POST /auth/refresh
GET  /catalog/tracks/{id} · GET /catalog/albums/{id} · GET /catalog/artists/{id}
GET  /search?q=&type=track|artist|album|playlist
GET  /home                      → assembled shelves
GET  /playback/stream/{trackId} → { audioUrl }
POST /playback/session          → create/resume session + queue
PATCH /playback/session/queue   → play-next / add / reorder / clear
GET  /library · POST /library/like/{trackId} · DELETE /library/like/{trackId}
POST /playlists · PATCH /playlists/{id} · POST /playlists/{id}/tracks
```

### 1.6 Critical Flow — Playback
```
Client → API: GET /playback/stream/{trackId}
API (Playback Module) → Catalog: resolve audio_url + check streamable
API → Redis: update nowplaying + queue position
API → Client: { audioUrl }
Client (HLS.js / Web Audio API) → Audio Source: fetch and decode audio
```

### 1.7 Cross-Cutting Concerns
- **Security:** OAuth2/OIDC, JWT access + refresh, HTTPS only (Vercel/Render enforce HTTPS).
- **Scaling:** Single Render instance (free tier); Postgres on Render/Supabase free tier; Redis on Upstash free tier. Sufficient for MVP traffic.
- **Observability:** Render logs (free), basic health endpoint, console structured logging.

### 1.8 Exit Criteria
User can sign up, search, build library/playlists, and play music end-to-end with < 500 ms time-to-audio. Home renders heuristic shelves. Deployed on Vercel + Render via GitHub Actions.

---

# PHASE 2 — Adaptive Discovery v1

> **PRD mapping:** B1–B7 (Discovery concept, trigger logic, candidate selection, split-screen UX, event capture, basic pairwise learning, discovery settings), plus A11 discovery settings.
> **Architecture posture:** Introduce a **Postgres-backed event pipeline** and deploy the **Recommendation Service** (Python/FastAPI) as a second free Render service.

### 2.1 Goal & Scope
Add the split-screen A/B Discovery prompt, capture every choice as a structured event in Postgres, stand up the recommendation service with pgvector embeddings, and close a **basic learning loop** (pairwise preference → taste embedding) that begins to influence candidate selection and Home.

### 2.2 Architecture Additions
| Component | Responsibility |
|---|---|
| **Discovery Module** (in monolith) | Trigger engine (when to prompt), requests candidate pairs, serves them to client, validates & records the choice. |
| **Recommendation Service** (Python/FastAPI) | Generates contrastive candidate pairs; maintains per-user taste embedding via pgvector; ranks tracks. **Second Render free-tier service.** |
| **Postgres Event Table** | `discovery_events` and `playback_events` tables replace Kafka — append-only, polled by the recommendation service. |
| **pgvector Extension** | User and track embeddings stored directly in Postgres — no separate feature store needed. |
| **Cron-based Processor** | Render cron job (or scheduled task) consumes new events, applies online pairwise updates to embeddings. |
| **Discovery Settings** | Persisted user controls (on/off, frequency, previews, reset, private-session exclusion). |

### 2.3 Component Diagram (End of Phase 2)
```
┌──────────────┐        ┌───────────────────┐
│  Web Client  │───────►│  NestJS Monolith   │
│ split-screen │        │  (Render free)      │
│  (Vercel)    │        └───┬──────────┬─────┘
└──────────────┘            │          │
        ┌───────────────────┘          └───────────────┐
        ▼ (P1 modules: Auth/Catalog/Playback/Library/Search/Home)
   ┌─────────────────────────────┐        ┌──────────────────────┐
   │      Monolith (P1 modules)  │        │  Discovery Module     │
   │  + writes playback_events   │        │  trigger · serve pair │
   │    to Postgres              │        │  validate · record    │
   └──────────────┬──────────────┘        └────────┬───┬─────────┘
                  │                                │   │ candidate pair req
                  │            ┌────────────────────▼───▼──────────┐
                  │            │  Recommendation Service (FastAPI)  │
                  │            │  candidate gen · taste embedding   │
                  │            │  ── Render free tier (2nd svc) ──  │
                  │            └───────┬──────────────────┬─────────┘
                  │                    │ reads             │ reads/writes
     ┌────────────▼───────────┐   ┌────▼──────────────────▼─────────┐
     │      PostgreSQL         │   │ pgvector in same Postgres DB    │
     │ + discovery_settings    │   │ user_embeddings · track_features │
     │ + discovery_events      │   └─────────────────────────────────┘
     │ + playback_events       │
     └─────────────────────────┘

     ┌──────────────────┐
     │  Upstash Redis    │  disc:counter · disc:backoff · disc:coldstart
     └──────────────────┘

     ┌──────────────────────────────────────────────┐
     │  Cron Job (Render scheduled task)              │
     │  polls new events → pairwise embedding update  │
     └──────────────────────────────────────────────┘
```

### 2.4 Data Stores (Additions)
**PostgreSQL:**
- `discovery_settings` (user_id, enabled, frequency_pref, previews_enabled, updated_at)
- `discovery_events` (id, user_id, session_id, ts, time_of_day, day_of_week, context JSONB, candidate_a, candidate_b, chosen_track_id, rejected_track_id | no_choice, decision_latency_ms, preview_behavior JSONB, downstream_engagement JSONB)
- `playback_events` (id, user_id, track_id, event_type, ts, metadata JSONB) — replaces Kafka topic
- `user_embeddings` (user_id, embedding vector(128), updated_at) — pgvector
- `track_features` (track_id, features vector(128), updated_at) — pgvector

**Upstash Redis:** `disc:counter:{sessionId}`, `disc:backoff:{userId}`, `disc:coldstart:{userId}`.

### 2.5 Key APIs / Contracts
```
# Client ↔ Discovery (NestJS)
GET  /discovery/should-prompt?sessionId=       → { prompt: bool, reason }
GET  /discovery/pair?sessionId=&context=       → { candidateA, candidateB, promptId }
POST /discovery/choice                         → { promptId, chosen, latencyMs, previewBehavior }
                                                 (returns audioUrl for chosen track)
# NestJS ↔ Recommendation Service (internal HTTP)
POST /reco/candidates/pair  { userId, context } → { a, b, rationale }
# Settings
GET/PATCH /settings/discovery
```
**Event schema (`discovery_events`):** mirrors PRD §B5 — both candidates' feature vectors, choice, latency, preview behavior, inferred context, downstream engagement (backfilled).

### 2.6 Critical Flow — Adaptive Discovery
```
1. Song ends → Client asks NestJS: should-prompt?
2. Discovery trigger engine checks: settings on? frequency counter ≥ N?
   not a focused/private/queued-album context? backoff state?  → yes
3. NestJS → Recommendation Service (HTTP): request contrastive pair
   Recommendation reads user embedding + track features from pgvector
4. NestJS → Client: { candidateA, candidateB, promptId } (art preloaded)
5. User clicks a side → Client POST /discovery/choice
6. NestJS: validate promptId, resolve audioUrl for chosen track,
   INSERT discovery_event to Postgres, reset frequency counter
7. Client: chosen side expands → plays instantly
8. Cron job polls new events → online pairwise update to taste embedding
9. Downstream engagement (finish/skip/save) backfilled to same event row
```

### 2.7 Trigger Engine Detail (State it owns, in Upstash Redis)
- `disc:counter:{sessionId}` — songs since last prompt (against dynamic N ∈ 4–8).
- `disc:backoff:{userId}` — increments on dismiss/ignore, decays over time.
- `disc:coldstart:{userId}` — boosts frequency for first ~20 interactions.
- Context guards read from playback session (queued album, sleep timer, private session).

### 2.8 Cross-Cutting Concerns
- **Graceful degradation:** If Recommendation Service is down, Discovery either skips the prompt or serves a heuristic pair (popular-in-genre vs. random-adjacent). Playback never blocks.
- **Privacy:** Private sessions short-circuit at the Discovery Module — no event inserted. Opt-out disables the trigger engine entirely.
- **Idempotency:** `promptId` dedupes double-submits; late choices past timeout recorded as `no_choice`.
- **Free-tier limits:** Upstash Redis free tier (10K commands/day) is sufficient for trigger state. Postgres connection pooling via Render/Supabase.

### 2.9 Exit Criteria
Split-screen prompt appears per trigger rules, choices are captured in Postgres, taste embedding updates via cron, and candidate pairs + Home reflect learned preferences. Discovery settings fully functional. ≥ 60% engagement target instrumented.

---

# PHASE 3 — Personalization Depth

> **PRD mapping:** B3 (richer candidate selection), B6 (full learning loop — contextual mood/activity), B8 (Discovery Recap/Insights), A3/A5 (Made-for-You mixes, discovery-informed Home).
> **Architecture posture:** Add **cron-based batch retraining** alongside online updates; generate **Made-for-You mixes** from learned preferences; ship the **Discovery Recap**. All on free infra.

### 3.1 Goal & Scope
Deepen the ML: model **context** (mood/activity/time), run **periodic batch retraining** via cron jobs, generate **Made-for-You mixes** from learned preferences, and ship the **Discovery Recap**. Tune exploration/exploitation.

### 3.2 Architecture Additions
| Component | Responsibility |
|---|---|
| **Batch Retraining Cron** | Scheduled Render cron job retrains ranking/preference models over full event history in Postgres; updates pgvector embeddings. |
| **Contextual Model** | Infers mood/activity/context vector from recent behavior; feeds candidate selection & Home ranking. Runs within the Recommendation Service. |
| **Mix Generation Cron** | Builds Daily Mixes / Discover-Weekly-style playlists per user, materialized as Postgres rows for fast reads. |
| **Insights Endpoint** | Aggregates discovery history into "Your Discovery Recap" — runs as a query in the Recommendation Service. |
| **Personalized Home Cache** | Materialized per-user Home shelves cached in Redis for fast reads. |

### 3.3 Component Diagram (Deltas over Phase 2)
```
        Postgres event tables ──────────────────────────────────┐
             │ polled by cron                                    │
      ┌──────▼───────┐   ┌───────────────────┐                  │
      │ Online Cron   │   │ Batch Retrain     │                  │
      │(pairwise upd.)│   │ Cron (nightly)    │                  │
      └──────┬───────┘   └───────┬───────────┘                  │
             │ writes            │ writes                        │
        ┌────▼───────────────────▼────┐                          │
        │   pgvector in Postgres       │                          │
        │  user/context/track vectors  │                          │
        └──────────────────────────────┘                          │
                                                                  │
   ┌───────────────┐    materialize    ┌──────────────┐    reads │
   │ Mix Gen Cron  │──────────────────►│ Postgres     │◄─────────┘
   │ (Daily Mixes) │                    │ mixes table  │
   └───────────────┘                    └──────┬───────┘
                                               │  serves Home/mixes
   ┌────────────────┐                   ┌──────▼──────┐
   │Insights (query)│───reads events───►│  NestJS API │──► Client (Recap UI)
   └────────────────┘                   └─────────────┘

   ┌──────────────┐
   │ Upstash Redis │  cached home:{userId}, mixes:{userId}
   └──────────────┘
```

### 3.4 Data / Model Additions
- pgvector: adds `context_vector` column to `user_embeddings` (mood/activity/time).
- `discovery_recap` materialized view or table (top new artists, mood trends, taste-shift deltas).
- `user_mixes` table: materialized per-user playlists with track lists.
- Redis cache: `home:{userId}`, `mixes:{userId}` — serialized JSON, TTL-based.

### 3.5 Key Contracts
```
POST /reco/rank            { userId, context, candidateSet } → ranked list
GET  /home                 → now served from Redis cache (falls back to heuristic)
GET  /mixes/made-for-you   → materialized per-user mixes from Postgres
GET  /insights/recap       → Discovery Recap payload (computed on-demand or cached)
```

### 3.6 Critical Flow — Blended Learning Loop
```
Online path  : choice event → INSERT to Postgres → cron polls → embedding nudge
Batch path   : nightly cron → reads full event history → retrains ranking model
             → updates pgvector embeddings
Serving path : Recommendation Service reads context_vector + embeddings
             → ranks candidates for Discovery pairs, Home, and mixes
Feedback     : blended with passive signals (listen-through/skip/save) per PRD §B6
```

### 3.7 Cross-Cutting Concerns
- **Model safety:** Batch retrain produces new embeddings; compare metrics before overwriting (can be manual review for MVP).
- **Cold start:** New users get heuristic Home + higher discovery frequency until embedding matures (< 20 interactions per KPI).
- **Explainability:** "Because you chose X over Y" rationale stored with recommendations for UI surfacing.
- **Free-tier limits:** Nightly cron must complete within Render free-tier limits. Postgres row counts manageable for MVP user base.

### 3.8 Exit Criteria
Context-aware recommendations live; Made-for-You mixes materialized; Discovery Recap shipped; measurable ≥ 15% relevance lift in the discovery-active cohort vs. control.

---

# PHASE 4 — Social, Offline, Connect & Monetization [POST-MVP]

> **This phase is deferred to post-MVP. It requires paid infrastructure (Stripe, DRM providers, dedicated WebSocket servers, ad-serving).**

> **PRD mapping:** A8 (Social/Friend Activity/Blend), A9 (Offline/Downloads), A10 (Connect/Multi-Device), A12 (Monetization/Ads/Billing), A13 (Notifications), A7 (Podcasts).
> **Architecture posture:** Extract independently-scaling services; add WebSocket layer and DRM-protected downloads. Requires migration to paid cloud (AWS/GCP + Kubernetes).

### 4.1 Summary of Additions (when funded)
- **Social Service** — Follow graph, friend activity, Blend playlists.
- **Realtime Gateway (WebSocket)** — Friend activity push, Connect state sync.
- **Connect Coordinator** — Device registry, playback transfer.
- **Download/Offline Service** — DRM-licensed encrypted bundles.
- **Billing Service** — Stripe integration, subscription lifecycle.
- **Ad Service** — Audio/display ad insertion for free tier.
- **Notification Service** — Web push + email.
- **Podcast Module** — Episode browse/subscribe/play.
- **Infrastructure upgrade:** Kubernetes, Kafka (replaces Postgres events), Elasticsearch (replaces Postgres FTS), paid CDN, multi-region.

---

# PHASE 5 — Scale & Mobile [POST-MVP]

> **This phase is deferred to post-MVP. It requires paid cloud infrastructure for multi-region, autoscaling, and production-grade reliability.**

> **PRD mapping:** §6 Non-Functional Requirements (performance, scalability, reliability), mobile-web polish + native groundwork.
> **Architecture posture:** Full microservice extraction, multi-region, aggressive caching, API versioning for native clients.

### 5.1 Summary of Additions (when funded)
- Autoscaling (HPA) on Kubernetes for all services.
- Postgres read-replica fan-out + partitioning/sharding.
- Redis cluster (replaces Upstash free tier).
- Multi-region CDN edges, geo-routing.
- Partitioned Kafka topics, backpressure, DLQ, exactly-once.
- Circuit breakers, bulkheads, chaos/load testing.
- GDPR/CCPA export & deletion pipelines at scale.
- Responsive split-screen (top/bottom vs left/right by orientation).
- PWA/offline shell, versioned BFF API for native clients.

---

## 6. Cross-Phase Traceability Matrix

| PRD Feature | Phase | Primary Module(s) | MVP? |
|---|---|---|---|
| A1 Auth & Onboarding | 1 | Auth | ✅ |
| A2 Playback / Player | 1 | Playback/Streaming | ✅ |
| A3 Search | 1 (Postgres FTS) | Search | ✅ |
| A4 Library & Playlists | 1 | Library/Playlist | ✅ |
| A5 Personalized Home | 1 (heuristic), 3 (ML) | Home, Recommendation | ✅ |
| A6 Artist/Album Pages | 1 | Catalog | ✅ |
| A7 Podcasts | 4 | Podcast/Catalog | ❌ Post-MVP |
| A8 Social / Blend | 4 | Social, Realtime | ❌ Post-MVP |
| A9 Offline/Downloads | 4 | Download/Offline | ❌ Post-MVP |
| A10 Connect/Multi-Device | 4 | Connect, Realtime | ❌ Post-MVP |
| A11 Settings | 1 (base), 2 (discovery) | Settings, Discovery | ✅ |
| A12 Monetization/Ads/Billing | 4 | Billing, Ad | ❌ Post-MVP |
| A13 Notifications | 4 | Notification | ❌ Post-MVP |
| B1–B5 Discovery UX + capture | 2 | Discovery | ✅ |
| B6 Learning loop | 2 (basic), 3 (deep) | Recommendation, Cron jobs | ✅ |
| B7 Discovery settings | 2 | Discovery/Settings | ✅ |
| B8 Discovery Recap | 3 | Insights | ✅ |
| §6 NFRs (scale/perf/reliability) | 5 | Platform-wide | ❌ Post-MVP |

---

## 7. Key Architectural Decisions (ADR Summary)

| # | Decision | Rationale |
|---|---|---|
| ADR-1 | Modular monolith on Render free tier for entire MVP | Zero-cost; avoids K8s/microservice overhead; extract services post-MVP on real scaling needs. |
| ADR-2 | Postgres event tables instead of Kafka | Kafka requires paid infra; Postgres is free and sufficient for MVP event volumes. Migrate to Kafka post-MVP. |
| ADR-3 | Postgres full-text search (`tsvector`) instead of Elasticsearch | ES requires paid hosting; Postgres FTS is free, built-in, and sufficient for MVP catalog size. |
| ADR-4 | pgvector for embeddings instead of separate Feature Store | Keeps everything in one free Postgres instance; no additional service to host. |
| ADR-5 | Recommendation Service extracted as sole separate service (Phase 2) | Python ML ecosystem; different runtime from NestJS; still free on Render's second free service. |
| ADR-6 | Cron-based event processing instead of stream processor | No Kafka/Flink; Render cron + Postgres polling is free and sufficient for MVP. |
| ADR-7 | Graceful degradation as a first-class requirement | Personalization outage must never break playback (PRD §6.3). |
| ADR-8 | Privacy short-circuit at Discovery Module | Private sessions/opt-out never insert events — privacy by construction. |
| ADR-9 | Direct audio URLs (no CDN/DRM) for MVP | No paid CDN or DRM licensing in MVP; audio served directly from catalog source API. |
| ADR-10 | Vercel (FE) + Render (BE) — zero-cost hosting | Both offer generous free tiers; auto-deploy from GitHub; HTTPS included. |

---

## 8. Risks Carried From PRD (Architecture Mitigations)

| PRD Risk | Architectural Mitigation | Phase |
|---|---|---|
| Discovery feels intrusive | Trigger engine with Redis-backed frequency/backoff/cold-start state | 2 |
| Cold-start recommendations poor | Heuristic fallback + higher early frequency + onboarding seed | 1–3 |
| Recommendation outage | Graceful degradation: heuristic pairs, Discovery pauses | 2+ |
| Behavioral-tracking privacy | Opt-out + private-session short-circuit + deletion | 2 |
| Sparse single-choice signal | Blend with passive signals in event table | 2–3 |
| Split-screen latency | Preload candidate art; < 200 ms render target | 2 |
| Free-tier limits (Render/Upstash) | Monitor usage; design for low resource consumption; upgrade to paid when needed | 0–3 |
| Postgres as event store (not Kafka) | Sufficient for MVP; migrate to Kafka when event volume requires it | 2–3 |

---

*End of Document*
