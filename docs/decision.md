# Decision Log
## Personifier — Phase-Wise Technical & Product Decisions (MVP)

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 (MVP) |
| **Date** | 2026-07-06 |
| **Companion Docs** | [Product_requirement.md](Product_requirement.md) · [Architecture.md](Architecture.md) · [Implementation_Plan.md](Implementation_Plan.md) · [eval.md](eval.md) |
| **Purpose** | Document every significant technical and product decision per phase, with context, alternatives considered, rationale, and trade-offs |

> **Convention:** Each decision is tagged `[TECH]` (technical/architecture), `[PRODUCT]` (product/UX), or `[INFRA]` (infrastructure/ops). Decisions are numbered `D{phase}.{seq}`.

---

# PHASE 0 — Foundation & Enablement

### D0.1 [INFRA] Monorepo over polyrepo

| Aspect | Detail |
|---|---|
| **Decision** | Use a single monorepo (`apps/web`, `apps/api`, `packages/*`) instead of separate repos per service. |
| **Alternatives** | (A) Separate repos for FE and BE. (B) Monorepo with Turborepo/Nx. (C) Simple monorepo with npm workspaces. |
| **Chosen** | (C) Simple monorepo with npm/pnpm workspaces. |
| **Rationale** | Small team (2–4 devs); shared TypeScript types between FE/BE; single PR for cross-cutting changes; Turborepo/Nx adds tooling overhead not needed at MVP scale. |
| **Trade-off** | CI runs the full suite on every PR (acceptable at MVP size). Loses independent deployability — acceptable since FE (Vercel) and BE (Render) deploy from different subdirectories anyway. |
| **Revisit when** | Team grows past 6 engineers or build times exceed 10 min. |

---

### D0.2 [INFRA] Vercel (FE) + Render (BE) over single-platform hosting

| Aspect | Detail |
|---|---|
| **Decision** | Host the Next.js frontend on **Vercel** (free) and the NestJS API on **Render** (free web service). |
| **Alternatives** | (A) Both on Render. (B) Both on Vercel (Edge Functions for API). (C) Railway free tier. (D) Fly.io free tier. |
| **Chosen** | Vercel (FE) + Render (BE). |
| **Rationale** | Vercel is purpose-built for Next.js — instant deploys, edge CDN, preview per PR, zero config. Render provides a proper Node.js server process needed for NestJS (WebSocket support later, persistent connections to Postgres/Redis). Railway and Fly.io free tiers are more limited or require credit card. |
| **Trade-off** | Two platforms to manage; Render free tier has cold starts (~30s after 15 min idle). |
| **Mitigation** | Health-ping cron to keep Render warm (or accept cold starts for MVP). |

---

### D0.3 [INFRA] Render/Supabase Postgres over other free DBs

| Aspect | Detail |
|---|---|
| **Decision** | Use **Render Postgres** (free, 1 GB) or **Supabase Postgres** (free, 500 MB) as the system of record. |
| **Alternatives** | (A) Render Postgres. (B) Supabase. (C) Neon Postgres. (D) PlanetScale (MySQL). (E) SQLite on Render disk. |
| **Chosen** | Render Postgres or Supabase (team's choice — both work). |
| **Rationale** | Postgres is required for `pgvector` (Phase 2). Render Postgres is co-located with the API (lower latency). Supabase offers a nicer dashboard + built-in Storage. Neon is also viable but less battle-tested. PlanetScale is MySQL (no pgvector). SQLite can't handle concurrent writes from multiple dynos. |
| **Trade-off** | Render free Postgres has 1 GB limit and expires after 90 days (must recreate or upgrade). Supabase has 500 MB but no expiry. |
| **Revisit when** | DB size approaches limit or need read replicas. |

---

### D0.4 [INFRA] Upstash Redis over alternatives

| Aspect | Detail |
|---|---|
| **Decision** | Use **Upstash Redis** (free tier: 10K commands/day, 256 MB) for sessions, queue, cache, and trigger state. |
| **Alternatives** | (A) Upstash. (B) Redis on Render (no free tier currently). (C) In-memory cache (no external Redis). (D) Vercel KV (Upstash-backed, but tied to Vercel). |
| **Chosen** | (A) Upstash. |
| **Rationale** | Truly serverless Redis — no server to manage, free tier generous enough for MVP traffic. REST + native Redis protocol supported. Works from both Vercel Edge Functions and Render. |
| **Trade-off** | 10K commands/day limit; latency slightly higher than co-located Redis (~5–10 ms). |
| **Mitigation** | Batch Redis operations where possible; monitor usage; upgrade to paid ($0.20/100K commands) if needed. |

---

### D0.5 [INFRA] GitHub Actions over other CI

| Aspect | Detail |
|---|---|
| **Decision** | Use **GitHub Actions** for CI (lint, test, build on PR). Deployment handled by Vercel/Render auto-deploy. |
| **Alternatives** | (A) GitHub Actions. (B) GitLab CI. (C) CircleCI free tier. (D) No CI (just deploy). |
| **Chosen** | (A) GitHub Actions. |
| **Rationale** | Free for public repos and generous for private (2,000 min/month). Native GitHub integration. Vercel and Render handle CD natively — no need for CI to manage deployments. |
| **Trade-off** | None significant for MVP. |

---

# PHASE 1 — Core Streaming MVP

### D1.1 [TECH] Postgres full-text search over Elasticsearch

| Aspect | Detail |
|---|---|
| **Decision** | Use **PostgreSQL `tsvector` + `ts_rank` + GIN indexes** for search instead of Elasticsearch. |
| **Alternatives** | (A) Postgres FTS. (B) Elasticsearch (Bonsai free tier). (C) Meilisearch Cloud (free tier). (D) Algolia (free tier, 10K records). (E) Client-side search (Fuse.js). |
| **Chosen** | (A) Postgres FTS. |
| **Rationale** | Zero additional services; no network hop; free; handles catalog sizes up to ~100K tracks well; supports prefix matching, ranking, and weighted search. Elasticsearch requires a separate service (Bonsai free tier is limited to 10K docs / 125 MB). |
| **Trade-off** | Less sophisticated ranking than ES; no fuzzy matching out-of-the-box (can add `pg_trgm` for similarity); no autocomplete facets. Search quality may be lower for typos. |
| **Mitigation** | Add `pg_trgm` extension for trigram similarity; consider Meilisearch if search quality becomes a problem. |
| **Revisit when** | Catalog exceeds 100K tracks or search quality feedback is negative. |

---

### D1.2 [TECH] Direct audio URLs over CDN + signed URLs

| Aspect | Detail |
|---|---|
| **Decision** | Serve audio via **direct URLs from the catalog source API** (e.g., Spotify preview URLs, Jamendo stream URLs) — no custom CDN or signed-URL infrastructure. |
| **Alternatives** | (A) Direct source URLs. (B) Proxy audio through Render API. (C) Store audio in S3 + CloudFront with signed URLs. (D) Store in Supabase Storage. |
| **Chosen** | (A) Direct source URLs. |
| **Rationale** | Zero storage/bandwidth cost; no DRM complexity; catalog source API handles hosting. Proxying through Render would hit bandwidth limits and add latency. S3+CloudFront costs money. |
| **Trade-off** | Dependent on source API uptime/rate limits; no control over audio quality/bitrate; no offline capability; URLs may expire (need refresh logic). If using Spotify previews, limited to 30-second clips. |
| **Mitigation** | Implement URL refresh on 403/expiry; cache resolved URLs in Redis with TTL; clearly document catalog source dependency. |
| **Revisit when** | Need full-length tracks (requires licensing + own storage) or need offline support. |

---

### D1.3 [PRODUCT] Heuristic Home over empty state

| Aspect | Detail |
|---|---|
| **Decision** | Home page for new users shows **heuristic shelves** (popular, genre-seeded, recently played) rather than an empty state or generic content. |
| **Alternatives** | (A) Heuristic shelves from onboarding seed. (B) Empty "explore" state. (C) Purely popularity-based. (D) Editorial/curated playlists. |
| **Chosen** | (A) Heuristic shelves. |
| **Rationale** | Onboarding collects 3–5 genre/artist preferences — enough to seed relevant shelves. An empty state feels broken. Pure popularity ignores the seed. Editorial requires manual curation effort. |
| **Trade-off** | Heuristic quality is mediocre until discovery data enriches the profile (Phase 2–3). |
| **Mitigation** | Cold-start boost in Phase 2 (higher discovery frequency) accelerates profile learning. |

---

### D1.4 [TECH] Upstash Redis for session/queue state over Postgres

| Aspect | Detail |
|---|---|
| **Decision** | Store **playback sessions, queue state, now-playing, and hot cache** in Upstash Redis, not Postgres. |
| **Alternatives** | (A) Redis for all ephemeral state. (B) Postgres for everything (sessions in DB). (C) In-memory + Postgres fallback. |
| **Chosen** | (A) Redis. |
| **Rationale** | Queue/session state is ephemeral and high-frequency read/write — Redis is purpose-built for this. Postgres would add write amplification and latency for non-durable data. In-memory loses state on Render cold-start/restart. |
| **Trade-off** | Upstash free-tier 10K commands/day is a constraint; queue state lost if Redis is flushed (acceptable for MVP). |
| **Mitigation** | Persist critical data (resume position) to Postgres periodically; monitor Redis command count. |

---

### D1.5 [TECH] HLS.js + Web Audio API over native HTML5 audio

| Aspect | Detail |
|---|---|
| **Decision** | Use **HLS.js for adaptive streaming** and **Web Audio API for audio processing** (crossfade, gapless, EQ) in the browser. |
| **Alternatives** | (A) HLS.js + Web Audio API. (B) Native `<audio>` element only. (C) dash.js (MPEG-DASH). (D) Howler.js. |
| **Chosen** | (A) HLS.js + Web Audio API. |
| **Rationale** | HLS.js handles adaptive bitrate if the source provides HLS manifests; Web Audio API enables crossfade/gapless playback. Native `<audio>` lacks crossfade and fine-grained control. If the catalog source provides direct MP3/OGG URLs (not HLS), HLS.js is optional and we fall back to Web Audio API + `<audio>` element. |
| **Trade-off** | Web Audio API is more complex to implement; HLS.js adds ~60KB to bundle. |
| **Mitigation** | Abstract behind a `PlayerEngine` interface so we can swap implementations based on source format. |

---

### D1.6 [PRODUCT] OAuth priority: Google > Apple > Facebook

| Aspect | Detail |
|---|---|
| **Decision** | Implement OAuth in order: **Google first** (highest adoption), then Apple, then Facebook. |
| **Alternatives** | All three simultaneously; or email-only first. |
| **Chosen** | Sequential: Google → Apple → Facebook, with email+password always available. |
| **Rationale** | Google OAuth is simplest (well-documented, free); Apple requires paid developer account ($99/year — may defer); Facebook OAuth has declining usage. Email+password ensures no blocker. |
| **Trade-off** | Apple Sign-In may be deferred if developer account cost is a concern (conflicts with $0 goal). |
| **Open question** | Does Apple's $99/year developer fee count as "free"? If not, defer Apple OAuth to post-MVP. |

---

### D1.7 [TECH] Cloudinary over Supabase Storage for images

| Aspect | Detail |
|---|---|
| **Decision** | Use **Cloudinary free tier** (25K transformations/month, 25 GB storage) OR **Supabase Storage** (1 GB free) for album art, artist images, and playlist covers. |
| **Alternatives** | (A) Cloudinary. (B) Supabase Storage. (C) Imgur API. (D) Store in Postgres as base64 (bad idea). |
| **Chosen** | Team's choice between (A) and (B). |
| **Rationale** | Cloudinary offers on-the-fly image transformations (resize, crop, format conversion) — useful for responsive images. Supabase Storage is simpler but no transforms. If already using Supabase for Postgres, Storage is zero-config. |
| **Trade-off** | Cloudinary: 25K transforms/month limit. Supabase: 1 GB limit, no transforms. |

---

# PHASE 2 — Adaptive Discovery v1

### D2.1 [TECH] Postgres event tables over Kafka

| Aspect | Detail |
|---|---|
| **Decision** | Store discovery and playback events in **Postgres tables** (`discovery_events`, `playback_events`) instead of Kafka topics. Process via **cron-based polling**. |
| **Alternatives** | (A) Postgres tables + cron. (B) Kafka (Confluent Cloud free tier: 10 GB/month). (C) Redis Streams (Upstash). (D) In-memory queue (BullMQ on Render). (E) Supabase Realtime (Postgres CDC). |
| **Chosen** | (A) Postgres tables + cron. |
| **Rationale** | Zero additional services; events are already structured SQL rows; Postgres ACID guarantees; cron is free on Render. Confluent Cloud free tier has 10 GB/month but requires managing a separate service + schema registry. Redis Streams would consume Upstash command quota rapidly. BullMQ requires a persistent worker process (consumes Render free-tier hours). |
| **Trade-off** | No real-time streaming — events are polled every N minutes. Higher Postgres write load. No replay/rewind like Kafka. |
| **Mitigation** | Cron frequency of 1–5 min is sufficient for MVP (embedding updates don't need sub-second latency). Add `processed_at` column for idempotent polling. Index on `created_at` for efficient polling queries. |
| **Revisit when** | Event volume > 100K/day or need real-time streaming. Migrate to Kafka. |

---

### D2.2 [TECH] pgvector in Postgres over separate Feature Store

| Aspect | Detail |
|---|---|
| **Decision** | Store user and track embeddings using **pgvector extension** in the same Postgres instance — no separate vector DB or feature store. |
| **Alternatives** | (A) pgvector in Postgres. (B) Pinecone (free tier: 1 index, 100K vectors). (C) Qdrant (self-hosted on Render). (D) Weaviate Cloud (free sandbox). (E) Redis vector search (Upstash). |
| **Chosen** | (A) pgvector. |
| **Rationale** | Zero additional services; pgvector is a first-party Postgres extension; co-located with the rest of the data (no network hop for joins); Render/Supabase Postgres support pgvector. MVP embedding dimensions (~128) and user count (< 10K) are well within Postgres capabilities. |
| **Trade-off** | Slower than dedicated vector DBs for large-scale nearest-neighbor at millions of vectors. No built-in ANN index (IVFFlat/HNSW available in pgvector but less tunable). |
| **Mitigation** | Add IVFFlat or HNSW index when vector count > 50K. Migrate to Pinecone/Qdrant post-MVP if needed. |

---

### D2.3 [TECH] Recommendation Service as separate Render service over monolith module

| Aspect | Detail |
|---|---|
| **Decision** | Deploy the Recommendation/Personalization Service as a **separate Python/FastAPI service on Render's second free web service**, not as a module inside the NestJS monolith. |
| **Alternatives** | (A) Separate FastAPI service. (B) Python worker called via child process from NestJS. (C) Rewrite ML logic in TypeScript within NestJS. (D) Serverless function (Vercel/AWS Lambda). |
| **Chosen** | (A) Separate FastAPI service. |
| **Rationale** | Python ML ecosystem (NumPy, scikit-learn, sentence-transformers) is essential and impractical to replicate in TS. Render allows two free web services. Separate service enables independent iteration on ML without redeploying the monolith. |
| **Trade-off** | Network hop between NestJS and FastAPI (~10–50 ms); two services to monitor; both subject to Render cold starts. |
| **Mitigation** | Cache candidate pairs in Redis (short TTL); health-ping cron for both services. |

---

### D2.4 [PRODUCT] Binary choice (2 options) over multi-option

| Aspect | Detail |
|---|---|
| **Decision** | The Discovery prompt presents **exactly 2 candidates** — a binary A/B choice. |
| **Alternatives** | (A) Binary (2). (B) Ternary (3). (C) Swipe-based (sequential). (D) Rating scale (1–5). |
| **Chosen** | (A) Binary. |
| **Rationale** | Binary is fastest to decide (lower cognitive load); pairwise preferences are a clean ML signal (Bradley–Terry model); split-screen UX is visually balanced; more options dilute the signal and complicate the UI. |
| **Trade-off** | Less information per interaction vs. ternary; user may want neither option. |
| **Mitigation** | "Skip both / Not now" button handles the "neither" case. Contrastive candidate selection maximizes information gain per pair. |
| **Revisit when** | Post-MVP — experiment with 3-option in Phase 4+. |

---

### D2.5 [PRODUCT] Discovery prompt default frequency: dynamic N ∈ [4, 8]

| Aspect | Detail |
|---|---|
| **Decision** | Show the Discovery prompt after every **N songs, where N is dynamic between 4 and 8**, adapting to engagement. |
| **Alternatives** | (A) Fixed N=5. (B) Dynamic N ∈ [4, 8]. (C) Time-based (every 15 min). (D) Random (Poisson process). |
| **Chosen** | (B) Dynamic N ∈ [4, 8]. |
| **Rationale** | Fixed interval feels robotic; dynamic range allows cold-start boost (N=4) and backs off for disengaged users (N=8+). Time-based doesn't respect song boundaries. Random is unpredictable and harder to reason about. |
| **Trade-off** | More complex trigger logic; harder to debug. |
| **Mitigation** | Log trigger reason with each prompt for debugging. |

---

### D2.6 [PRODUCT] Audio previews default OFF

| Aspect | Detail |
|---|---|
| **Decision** | Hover/focus audio previews on the split-screen are **disabled by default**; user can opt-in via settings. |
| **Alternatives** | (A) Default off, opt-in. (B) Default on, opt-out. (C) Always on, no toggle. |
| **Chosen** | (A) Default off. |
| **Rationale** | Unexpected audio is jarring; protects flow; reduces audio buffering/bandwidth; respects users in shared/quiet environments. Users who want previews can enable them. |
| **Trade-off** | Users must choose "blind" (based on art/title/artist only) — may increase "Skip both" rate. |
| **Mitigation** | Show enough context (art, title, artist, genre tag) to make informed choices without audio. |

---

### D2.7 [TECH] Cron-based embedding updates over real-time stream processing

| Aspect | Detail |
|---|---|
| **Decision** | Update taste embeddings via a **cron job polling the Postgres event table** (every 1–5 min) instead of a real-time stream processor. |
| **Alternatives** | (A) Render cron + Postgres polling. (B) BullMQ worker on Render. (C) Supabase Edge Functions on insert trigger. (D) Postgres LISTEN/NOTIFY. |
| **Chosen** | (A) Render cron. |
| **Rationale** | Simplest; free; embedding updates don't need sub-second latency (1–5 min delay is imperceptible to the user). BullMQ requires a persistent worker (uses Render hours). Supabase Edge Functions have execution time limits. LISTEN/NOTIFY requires a persistent connection. |
| **Trade-off** | 1–5 minute delay before choices affect recommendations; cron may miss events if it fails (retried next cycle). |
| **Mitigation** | Idempotent processing (`processed_at` column); exponential retry on failure. |

---

### D2.8 [TECH] Private session: event short-circuit at source

| Aspect | Detail |
|---|---|
| **Decision** | When a user enables **private session**, the Discovery module **does not insert any events** to Postgres — the short-circuit happens at the source, not via post-hoc filtering. |
| **Alternatives** | (A) Don't insert events (source short-circuit). (B) Insert events but flag as private, filter on read. (C) Insert then delete after session ends. |
| **Chosen** | (A) Source short-circuit. |
| **Rationale** | Privacy by construction — no PII-linked events exist to leak, misprocess, or fail to delete. Simplest to audit. PRD mandates opt-out must be honored at capture time. |
| **Trade-off** | Cannot retroactively un-private a session's data; some data loss for users who toggle frequently. |

---

# PHASE 3 — Personalization Depth

### D3.1 [TECH] Cron-based batch retraining over Spark/Flink

| Aspect | Detail |
|---|---|
| **Decision** | Run nightly **batch model retraining as a Render cron job** (Python script querying Postgres) instead of Spark/Flink. |
| **Alternatives** | (A) Render cron + Python script. (B) Spark on Databricks free tier. (C) AWS Glue free tier. (D) Google Colab scheduled notebook. |
| **Chosen** | (A) Render cron + Python script. |
| **Rationale** | MVP data volume (< 100K events) fits in memory on a single process. Spark/Flink are overkill and require paid infra. Databricks free tier is community edition (limited scheduling). Colab is unreliable for production jobs. |
| **Trade-off** | Won't scale past ~1M events without optimization or migration; Render cron has a 15-minute execution limit on free tier. |
| **Mitigation** | Incremental processing (only new events since last run); migrate to Spark/serverless when data volume demands it. |

---

### D3.2 [TECH] Manual model comparison over automated shadow/canary

| Aspect | Detail |
|---|---|
| **Decision** | For MVP, compare new model metrics **manually** (or via a script) before promoting — no automated shadow/canary traffic splitting. |
| **Alternatives** | (A) Manual comparison + promotion. (B) Automated shadow mode (dual-serve, compare). (C) Full canary with traffic splitting. |
| **Chosen** | (A) Manual comparison. |
| **Rationale** | Automated shadow/canary requires infrastructure (traffic splitting, metric comparison pipelines, auto-rollback) that's overkill for MVP user volume. A simple script comparing offline metrics (precision@k, skip/save ratio) before overwriting embeddings is sufficient. |
| **Trade-off** | No live A/B comparison; relies on offline metrics which may not perfectly predict online performance. |
| **Mitigation** | Keep previous embeddings as a backup; can manually rollback within minutes. |
| **Revisit when** | User base > 1K active users; need statistical significance for model comparisons. |

---

### D3.3 [PRODUCT] Made-for-You mixes: materialized in Postgres over on-demand generation

| Aspect | Detail |
|---|---|
| **Decision** | Generate Daily Mixes / Discover-Weekly per-user via a **nightly cron job** and store them as **materialized rows in Postgres** (+ Redis cache) rather than computing on demand. |
| **Alternatives** | (A) Pre-materialized (cron + Postgres). (B) On-demand (compute when user loads Home). (C) Hybrid (compute + cache with TTL). |
| **Chosen** | (A) Pre-materialized. |
| **Rationale** | On-demand generation is slow (needs embedding lookup + ranking for each request); pre-materializing amortizes cost over quiet hours; users get instant load times from cache. |
| **Trade-off** | Mixes may be stale for up to 24 hours; Postgres storage for materialized playlists. |
| **Mitigation** | Set a "last refreshed" timestamp in UI; Redis cache with 6–12 hour TTL for even faster reads. |

---

### D3.4 [PRODUCT] Discovery Recap: on-demand query over pre-materialized

| Aspect | Detail |
|---|---|
| **Decision** | Generate the Discovery Recap **on demand** when the user opens the Recap page (query against Postgres), rather than pre-materializing it. |
| **Alternatives** | (A) On-demand query. (B) Pre-materialized nightly. (C) Pre-materialized weekly. |
| **Chosen** | (A) On-demand. |
| **Rationale** | Recap is accessed infrequently (weekly/monthly by engaged users); pre-materializing for all users wastes resources. Postgres aggregation queries are fast enough for the MVP event volume. |
| **Trade-off** | Slower page load for Recap (500 ms–2 s depending on history size) vs. instant from cache. |
| **Mitigation** | Cache the result in Redis with a 1-hour TTL after first computation. |

---

### D3.5 [PRODUCT] Cohort assignment: deterministic hash over random

| Aspect | Detail |
|---|---|
| **Decision** | Assign users to experiment cohorts (discovery-active vs. control) using a **deterministic hash of user_id** — not random assignment. |
| **Alternatives** | (A) Hash-based deterministic. (B) Random at signup. (C) Feature flag service (LaunchDarkly free tier). |
| **Chosen** | (A) Hash-based. |
| **Rationale** | Deterministic means the same user always gets the same cohort (no storage needed, no drift). Reproducible. Random requires persisting the assignment. LaunchDarkly adds a dependency for a simple feature. |
| **Trade-off** | Can't rebalance cohorts without changing the hash function; less flexible than a feature flag service. |

---

### D3.6 [TECH] Explainability stored per recommendation, not computed retroactively

| Aspect | Detail |
|---|---|
| **Decision** | Store the **"Because you chose X over Y" rationale** at recommendation time (alongside the candidate pair), not computed after the fact. |
| **Alternatives** | (A) Store at recommendation time. (B) Compute retroactively when user views. (C) No explainability in MVP. |
| **Chosen** | (A) Store at recommendation time. |
| **Rationale** | The rationale depends on the model state and feature vectors *at the time of the recommendation* — retroactive computation uses current (possibly different) model state and gives inconsistent explanations. Storage cost is one text field per recommendation. |
| **Trade-off** | Slightly larger event/recommendation rows. |

---

# POST-MVP Decision Stubs

> These decisions are **deferred** but documented to capture context for future work.

| ID | Topic | Key Question | Default Stance |
|---|---|---|---|
| D4.1 | Kafka vs. Postgres events | When to migrate? | When event volume > 100K/day or need real-time streaming |
| D4.2 | Elasticsearch vs. Postgres FTS | When to migrate? | When catalog > 100K tracks or search quality insufficient |
| D4.3 | DRM provider | Widevine vs. FairPlay vs. both? | Both (Widevine for Chrome/Android, FairPlay for Safari/iOS) |
| D4.4 | Stripe plan structure | Family/student/duo pricing? | Follow Spotify's pricing model |
| D4.5 | Ad provider | Self-serve vs. third-party? | Third-party ad network for MVP monetization |
| D4.6 | WebSocket infra | Socket.io on Render vs. dedicated? | Socket.io on Render first; dedicated Ably/Pusher if scale needs |
| D4.7 | Mobile: PWA vs. native | PWA-first vs. React Native? | PWA-first for web; React Native when funded |
| D4.8 | Multi-region | When to go multi-region? | When P95 latency from non-primary region > 500 ms |

---

*End of Document*
