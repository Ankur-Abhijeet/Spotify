# Product Requirements Document (PRD)
## Personifier — A Spotify Clone with Adaptive Discovery

| Field | Value |
|---|---|
| **Product Name** | Personifier |
| **Document Version** | 1.0 |
| **Author** | Product Team |
| **Date** | 2026-07-06 |
| **Status** | Draft |
| **Platform** | Web Application (responsive, desktop-first) |
| **Scope** | **MVP — free hosting, zero-cost infrastructure** |

> **⚠️ MVP Scope:** This document describes the full product vision. The current build targets an **MVP on entirely free infrastructure** (Vercel, Render free tier, Upstash Redis, Supabase/Render Postgres). Features marked **[POST-MVP]** below are deferred until the product graduates to paid infrastructure. The MVP ships **Phases 0–3** only (Core Streaming + Adaptive Discovery + Personalization).

---

## 1. Overview

### 1.1 Purpose
Personifier is a full-featured music streaming web application that replicates the complete Spotify experience (playback, library, playlists, search, social, offline, etc.) and layers on top a novel **Adaptive Discovery** feature.

The Adaptive Discovery feature periodically interrupts the listening flow with a lightweight, binary "A vs. B" choice: the screen splits in half and presents two different songs, one on each side. The user taps/clicks anywhere on a side to instantly play that song. Every choice is captured as an implicit signal and fed into a personalization engine that continuously refines the user's mood, activity, and taste model to improve future recommendations.

### 1.2 Problem Statement
Traditional music recommendation relies on passive signals (skips, listen duration, saves) which are noisy and slow to converge. Explicit feedback (thumbs up/down) suffers from low engagement because it feels like work. Personifier solves this by making feedback:
- **Effortless** — one click, no scrolling or typing.
- **Contextual** — asked in the natural gap between songs.
- **Fun & game-like** — a simple binary choice rather than a rating.
- **Immediately rewarding** — the choice *is* the next song, so feedback and consumption are the same action.

### 1.3 Goals & Non-Goals

**Goals**
- Deliver a Spotify-equivalent streaming experience on web.
- Introduce a frictionless preference-elicitation mechanic (Adaptive Discovery).
- Build a learning loop that measurably improves recommendation relevance over time.
- Keep the discovery prompt non-intrusive (frequency-capped, dismissible, respectful of flow).

**Non-Goals**
- Building a music licensing/rights business (assumes catalog is licensed/available via API).
- Native mobile apps (v1 is web; mobile is a later phase).
- Podcast/audiobook creation tooling (deferred post-MVP).
- Paid infrastructure or services (MVP runs at $0).
- Monetization, billing, or ad infrastructure (post-MVP).

### 1.4 Success Metrics (KPIs)

| Metric | Target |
|---|---|
| Discovery prompt engagement rate (clicked vs. shown) | ≥ 60% |
| Recommendation relevance lift (A/B vs. control) | ≥ 15% improvement in save/skip ratio |
| Avg. session length | +10% vs. baseline clone |
| D30 retention | ≥ 35% |
| Prompt dismissal / annoyance rate | ≤ 10% |
| Time-to-first-meaningful-recommendation | < 20 discovery interactions |

---

## 2. Target Audience & Personas

**Persona 1 — The Explorer (Maya, 24)**
Loves finding new music, follows curated playlists, gets bored of the same rotation. Adaptive Discovery is her favorite feature — she treats it like a game.

**Persona 2 — The Comfort Listener (Raj, 38)**
Wants his favorites on demand, low tolerance for interruption. Needs discovery to be frequency-capped and easy to turn off.

**Persona 3 — The Mood Listener (Sam, 19)**
Listens by activity/mood (studying, workout, sleep). Adaptive Discovery helps the app infer their current context quickly.

---

## 3. Assumptions & Dependencies
- A music catalog source is available via a free API (e.g., Spotify Web API for metadata + previews, or Jamendo for full Creative Commons tracks).
- Audio delivery uses direct streaming URLs (no DRM or paid CDN in MVP).
- Third-party auth (Google, Apple, Facebook, email) is available via free-tier OAuth.
- A recommendation/personalization service will be built in-house using free-tier compute.
- **[POST-MVP]** ~~Payment processor (Stripe) for Premium subscriptions.~~
- All infrastructure runs on free tiers: Vercel (FE), Render (BE), Upstash (Redis), Render/Supabase (Postgres).

---

## 4. Feature Requirements

The application is organized into two feature groups:
- **Section A — Core Spotify Parity Features** (must replicate the current Spotify experience).
- **Section B — Adaptive Discovery** (the differentiating feature).

---

## Section A — Core Spotify Parity Features

### A1. Authentication & Onboarding
- Sign up / log in via email+password, Google, Apple, Facebook.
- Password reset, email verification, session management, "remember me".
- Onboarding flow: pick 3–5 favorite genres/artists to seed the taste model.
- Free vs. Premium account tiers.

### A2. Music Playback (Core Player)
- Play, pause, next, previous, seek (scrubber), volume, mute.
- Shuffle, repeat (off / repeat-all / repeat-one).
- Persistent bottom playback bar across all pages (now-playing art, title, artist, progress).
- Queue management: view queue, "play next", "add to queue", reorder, clear.
- Crossfade & gapless playback (settings-controlled).
- Playback speed control (for podcasts).
- Gapless resume: continue where the user left off across sessions/devices.
- Audio quality selection (Low/Normal/High/Very High for Premium).
- Full-screen "Now Playing" view with lyrics, art, and up-next.

### A3. Search & Discovery (Standard)
- Universal search across songs, artists, albums, playlists, podcasts, users.
- Search-as-you-type with instant results and recent searches.
- Browse by genre, mood, and category hubs (e.g., Pop, Focus, Workout).
- "Made for You" section (Daily Mixes, Discover Weekly, Release Radar equivalents).
- Charts (Top 50 Global/Country, Viral, New Releases).

### A4. Library Management
- Liked Songs collection.
- Save/follow albums, artists, playlists, podcasts.
- Create, edit, delete, and reorder personal playlists.
- Collaborative playlists (multiple users can edit).
- Add/remove songs to playlists; drag-and-drop.
- Filter and sort library (recently added, alphabetical, creator).
- Playlist cover image upload and custom description.

### A5. Personalized Home
- Dynamic home feed: recently played, recommended playlists, new releases from followed artists, jump-back-in.
- Time-of-day aware shelves (morning/evening).

### A6. Artist & Album Pages
- Artist page: top tracks, discography, related artists, bio, monthly listeners, follow button.
- Album page: track list, play/shuffle, save, share.

### A7. Podcasts & Audiobooks (Consumption) **[POST-MVP]**
- Browse, search, subscribe, play episodes.
- Episode progress tracking, mark as played, download.

### A8. Social Features **[POST-MVP]**
- Follow friends and artists.
- Public/private profiles with playlists and followers.
- "Friend Activity" feed (what friends are listening to).
- Share songs/playlists/albums via link and to social platforms.
- Collaborative playlist and Blend (shared taste playlist) equivalents.

### A9. Offline & Downloads (Premium) **[POST-MVP]**
- Download songs/playlists/podcasts for offline playback.
- Offline mode toggle; manage downloaded storage.
- *Requires DRM infrastructure — not available on free tier.*

### A10. Connect & Multi-Device **[POST-MVP]**
- Transfer playback between devices ("Connect" equivalent).
- Sync state (queue, position, library) across devices in real time.
- *Requires dedicated WebSocket infrastructure — deferred.*

### A11. Settings & Account
- Profile editing. ~~Subscription management, payment methods.~~ **[POST-MVP]**
- Playback settings (crossfade, gapless, quality, autoplay, equalizer).
- Privacy settings (private session, listening history visibility).
- ~~Notification preferences.~~ **[POST-MVP]**
- **Adaptive Discovery settings** (see B7).
- Language, theme (light/dark), accessibility options.

### A12. Monetization **[POST-MVP]**
- Free tier: ad-supported, shuffle-limited on mobile-equivalent constraints (configurable).
- Premium tier: ad-free, offline, high quality, unlimited skips.
- Audio/display ad insertion for free tier.
- Subscription billing via Stripe (monthly/annual, family, student, duo plans).
- *Requires Stripe + ad-serving infrastructure — not available on free tier.*

### A13. Notifications **[POST-MVP]**
- New releases from followed artists, playlist updates, social activity.
- In-app and email/push (web push) notifications.
- *Requires push notification service — deferred.*

---

## Section B — Adaptive Discovery (Differentiating Feature)

### B1. Concept
Every so often, after a song ends, instead of auto-playing the next queued track, the app presents a **Split-Screen A/B Choice**:
- The screen is divided vertically into two equal halves from the center.
- Each half displays one song candidate (album art, title, artist, and a subtle "▶ tap to play" hint).
- The user clicks/taps **anywhere** on a half to choose and instantly play that song.
- The unchosen song is recorded as "rejected in this context."
- The choice, plus rich context, is sent to the personalization engine.

### B2. Trigger Logic
The prompt should feel natural, not spammy.

- **Frequency:** Show the prompt after every *N* songs, where *N* is dynamic (default range 4–8 songs) and adapts to engagement. Frequency-capped to a max per hour/session.
- **Placement:** Only at natural boundaries — after a song completes (not mid-song), and not during focused contexts (e.g., an explicitly queued album, a sleep timer, or a "do not disturb"/private session).
- **Cold start boost:** Higher frequency for new users (first ~20 interactions) to seed the model quickly, then taper.
- **Backoff:** If the user dismisses/ignores prompts repeatedly, reduce frequency automatically.
- **Never** interrupt user-initiated explicit playback (e.g., they just tapped a specific song) — respect intent.

### B3. Candidate Selection (What Two Songs to Show)
The two candidates are chosen by the recommendation engine to maximize information gain and enjoyment:

- **Exploration vs. exploitation:** One candidate leans "safe/known-taste," the other "exploratory," OR the two probe different dimensions (e.g., high-energy vs. calm; genre A vs. genre B; familiar artist vs. new artist).
- **Contextual relevance:** Candidates respect current inferred mood/activity and time of day.
- **Contrastive design:** The pair should differ along at least one meaningful axis (tempo, valence, genre, familiarity) so the choice yields a clean signal.
- **Playability:** Both must be fully licensed/streamable and not recently played/skipped by the user.
- **Fairness/diversity:** Avoid over-indexing on a single artist/label; include emerging artists.

### B4. Interaction & UX

**Layout**
- Full-bleed split screen, 50/50 vertical division with a clear center divider.
- Each side: large album art background (blurred/gradient overlay), song title, artist, and a "Tap anywhere to play" affordance.
- Optional subtle 5–10 second audio previews on hover/focus (desktop) to aid the choice — configurable.
- A small, low-emphasis **"Skip both / Not now"** control (e.g., center bottom) so the user is never forced to choose.
- Accessible: keyboard (←/→ to choose, Esc to dismiss), screen-reader labels, sufficient contrast.

**Behavior on choice**
- Instant playback of the chosen song with a smooth transition (chosen side expands to full player).
- The chosen song is added to the current listening context; queue continues intelligently after it.
- Micro-feedback animation confirming the choice.

**Behavior on dismiss**
- "Not now" resumes the normal queue and records a soft-negative/neutral signal + increments backoff.

**Timeout**
- If the user doesn't interact within a configurable window, auto-resume normal queue (records "no choice").

### B5. Data Captured Per Interaction
Each Adaptive Discovery event logs:
- `user_id`, `session_id`, `timestamp`, `time_of_day`, `day_of_week`.
- The two candidate `track_id`s and their feature vectors (genre, tempo/BPM, energy, valence, acousticness, popularity, familiarity-to-user, artist).
- `chosen_track_id`, `rejected_track_id` (or `no_choice`).
- Decision latency (ms to choose).
- Preview-hover behavior (which side was previewed, for how long).
- Inferred context (device, prior N tracks, current playlist/mood).
- Post-choice engagement (did they finish the chosen song? skip? save?).

### B6. Personalization / Learning Loop
- Each A/B choice is a **pairwise preference** signal → naturally suited to learning-to-rank / preference models (e.g., contextual bandits, Bradley–Terry, or embedding-space adjustment).
- Update the user's **taste embedding** and **contextual mood/activity model** after each choice.
- Blend Adaptive Discovery signals with passive signals (listen-through, skip, save) in the ranking model.
- Feed learned preferences back into: Home shelves, Made-for-You mixes, radio/autoplay, and future Discovery candidate selection.
- Support online (near-real-time) light updates plus periodic batch retraining.
- Explainability hook: surface "Because you chose X over Y" style reasoning where useful.

### B7. Discovery Controls (User Settings)
- Toggle Adaptive Discovery **on/off** entirely.
- Frequency preference: **Off / Occasional / Frequent**.
- Enable/disable hover audio previews.
- "Reset my discovery profile" (clear learned discovery signals).
- Private session excludes discovery events from the profile.

### B8. Insights (Optional, Delightful)
- A periodic "Your Discovery Recap": mood trends, top new artists found via discovery, taste shifts over time.
- Reinforces value and encourages continued engagement.

---

## 5. User Flows

### 5.1 First-Time User
1. Sign up → verify → choose genres/artists (seed).
2. Land on personalized Home (seeded).
3. Start playing a playlist/mix.
4. After a few songs → first Adaptive Discovery prompt (cold-start; slightly higher frequency).
5. Choice recorded → recommendations begin adapting.

### 5.2 Returning User — Adaptive Discovery
1. User is listening to a Daily Mix.
2. Song 5 ends → split screen appears with Song A (safe) vs. Song B (exploratory).
3. User clicks the right half → Song B plays instantly, right side expands to full player.
4. Event logged; taste/mood model updated.
5. Queue continues with newly informed recommendations.

### 5.3 Dismissing Discovery
1. Prompt appears → user clicks "Not now."
2. Normal queue resumes; frequency backs off.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Time-to-audio (play tap → sound) < 500 ms on broadband.
- Discovery split-screen renders < 200 ms; candidate art preloaded.
- Home/library initial render < 2 s (P95).

### 6.2 Scalability
- Support millions of concurrent streams; horizontally scalable services.
- Event pipeline must handle high-throughput discovery/telemetry ingestion.

### 6.3 Reliability
- 99.9% uptime for playback services.
- Graceful degradation: if the recommendation service is down, Discovery pauses and normal playback continues.

### 6.4 Security & Privacy
- Encrypted auth (OAuth2/OIDC), hashed passwords, secure sessions (HTTPS everywhere).
- DRM for protected audio.
- GDPR/CCPA compliance: data export, deletion, consent for behavioral tracking.
- Clear disclosure that Adaptive Discovery uses choices to personalize; opt-out honored.
- PII minimization in the event pipeline.

### 6.5 Accessibility (WCAG 2.1 AA)
- Keyboard navigation for all controls incl. the split-screen (←/→/Esc).
- Screen-reader labels, focus states, captions/transcripts for podcasts.
- Color-contrast compliance; reduced-motion mode disables discovery animations.

### 6.6 Responsiveness
- Desktop-first, fully responsive down to tablet and mobile-web.
- On mobile-web, split screen divides top/bottom or left/right based on orientation.

### 6.7 Browser Support
- Latest 2 versions of Chrome, Edge, Firefox, Safari.

---

## 7. Technical Architecture (High-Level)

### 7.1 Suggested Stack (MVP — Free Tier)
- **Frontend:** React (Next.js), TypeScript, Web Audio API + HLS.js for streaming, state via Zustand, Tailwind/CSS-in-JS. **Hosted on Vercel (free).**
- **Backend:** Node.js/NestJS modular monolith; REST gateway. Recommendation service in Python/FastAPI. **Hosted on Render (free tier).**
- **Streaming:** Direct audio URLs from catalog API (no DRM or paid CDN in MVP).
- **Data:** PostgreSQL via Render/Supabase (free tier), Upstash Redis (free tier), Cloudinary or Supabase Storage (free tier) for images.
- **Search:** PostgreSQL full-text search (`tsvector` + `ts_rank`) — no Elasticsearch in MVP.
- **Event/ML pipeline:** Postgres-backed event table + cron-based batch processing → `pgvector` for embeddings. No Kafka in MVP.
- **Realtime sync/Connect:** **[POST-MVP]** — WebSockets deferred.
- **Payments:** **[POST-MVP]** — Stripe deferred; single free tier only.
- **Infra:** Vercel (FE) + Render (BE) + GitHub Actions (CI/CD). No Kubernetes, no Terraform, no paid cloud.

### 7.2 Key Services (MVP)
- Auth Module, Catalog Module, Playback/Streaming Module, Library Module, Playlist Module, Search Module, Home Module, **Discovery Module**, **Recommendation/Personalization Service** (Python/FastAPI).
- **[POST-MVP]:** Social Service, Notification Service, Billing Service, Ad Service, Connect Coordinator.

### 7.3 Discovery Service Responsibilities
- Decide *when* to trigger a prompt (trigger engine).
- Request candidate pairs from the Recommendation Service.
- Serve the pair to the client; receive and validate the choice event.
- Emit the event to the pipeline and confirm playback handoff.

---

## 8. Data Model (Core Entities, Simplified)
- **User** (id, profile, settings, taste_embedding, discovery_settings).
- **Track** (id, title, artist_id, album_id, audio_features, streamable, popularity).
- **Artist**, **Album**, **Playlist** (id, owner, tracks, collaborative flag).
- **PlaybackSession** (id, user, queue, position).
- **LibraryItem** (user, item_type, item_id, saved_at).
- **DiscoveryEvent** (id, user, session, timestamp, context, candidate_a, candidate_b, chosen, rejected, latency, downstream_engagement).
- **[POST-MVP]** ~~Subscription (user, plan, status, billing).~~

---

## 9. Analytics & Instrumentation
- Track: DAU/MAU, session length, songs played, skips, saves.
- Discovery-specific: prompt shown, engaged, dismissed, timed-out; choice latency; exploration acceptance rate; downstream engagement of chosen tracks.
- Recommendation quality: skip rate, save rate, listen-through rate — segmented by discovery-active vs. control cohorts.
- Funnel: signup → onboarding complete → first play → first discovery → D1/D7/D30 retention.

---

## 10. Release Plan (Phased — MVP)

> MVP targets **Phases 0–3** on free infrastructure (~8–10 weeks). Phases 4–5 are deferred until the product graduates to paid infrastructure.

### Phase 0 — Foundation (MVP)
Repo scaffolding, Vercel + Render setup, GitHub Actions CI/CD, basic observability.

### Phase 1 — Core Streaming MVP
Auth, catalog, player, search (Postgres FTS), library, playlists, personalized home (heuristic).

### Phase 2 — Adaptive Discovery v1
Trigger engine, split-screen UI, event capture (Postgres-backed), basic pairwise learning (pgvector), discovery settings.

### Phase 3 — Personalization Depth
Contextual mood/activity modeling, cron-based batch retraining, discovery-informed mixes, insights/recap, exploration tuning.

### Phase 4 — Social, Offline, Connect, Monetization [POST-MVP]
Friend activity, blends, downloads (DRM), multi-device transfer, ads + Premium billing.

### Phase 5 — Scale & Mobile [POST-MVP]
Performance hardening, Kubernetes, multi-region, mobile-web polish, native app groundwork.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Discovery prompts feel intrusive | Dynamic frequency capping, easy dismiss, on/off toggle, backoff on ignore |
| Cold-start recommendations are poor | Onboarding genre/artist seed + higher early discovery frequency |
| Music licensing/rights | Assume licensed catalog via API; scope to available content |
| Privacy concerns over behavioral tracking | Transparent disclosure, opt-out, private session, data deletion |
| Interrupting user intent | Never prompt during explicitly queued/user-initiated playback |
| Sparse signal from single choices | Combine with passive signals; contrastive candidate design for max info gain |
| Latency in split-screen playback | Preload candidate audio/art; sub-500ms handoff target |

---

## 12. Open Questions
- Should the split screen ever show more than 2 options (e.g., 2 vs. 3) for richer signal? (Default: keep it binary for simplicity in v1.)
- Should hover audio previews be default-on or default-off? (Lean default-off to protect flow.)
- How is the reject signal weighted vs. an active skip elsewhere?
- ~~Does Discovery run during ad-supported free-tier sessions, and how does it interact with ad slots?~~ *(Deferred — no ads in MVP.)*
- Music catalog source for MVP: Spotify Web API (metadata + 30s previews) vs. Jamendo (full CC tracks) vs. other free source?

---

## 13. Glossary
- **Adaptive Discovery:** The split-screen binary A/B song-choice feature and its learning loop.
- **Taste Embedding:** A vector representation of a user's music preferences.
- **Contextual Bandit:** An online-learning algorithm balancing exploration and exploitation under context.
- **Pairwise Preference:** A signal indicating item A is preferred over item B in a given context.
- **Cold Start:** The state of having little/no data about a new user.

---

*End of Document*
