import os
import random
import logging
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reco-service")

app = FastAPI(title="Personifier Recommendation Service", version="1.0")

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Local fallback to SQLite shared with backend
    # We walk up to check in root folder
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "db.sqlite"))
    if not os.path.exists(sqlite_path):
        sqlite_path = "db.sqlite"
    DATABASE_URL = f"sqlite:///{sqlite_path}"
    logger.info(f"Using local SQLite fallback: {DATABASE_URL}")
else:
    logger.info("Using production Postgres connection")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Helper: Generate random unit vector (128 dimensions)
def get_random_vector(dim=128) -> List[float]:
    vec = np.random.normal(0, 1, dim)
    norm = np.linalg.norm(vec)
    return (vec / (norm if norm > 0 else 1)).tolist()

class PairRequest(BaseModel):
    userId: str
    context: Dict[str, Any] = {}

class ChoiceRequest(BaseModel):
    userId: str
    chosenTrackId: str
    rejectedTrackId: str

@app.get("/health")
def health():
    return {"status": "ok", "engine": engine.name}

@app.post("/reco/candidates/pair")
def get_candidate_pair(req: PairRequest):
    db = SessionLocal()
    try:
      # 1. Fetch user embedding (or initialize it)
      res_user = db.execute(
          text("SELECT embedding FROM user_embeddings WHERE userId = :userId"),
          {"userId": req.userId}
      ).fetchone()

      if not res_user:
          # Cold-start initialize user embedding
          init_emb = get_random_vector()
          import json
          db.execute(
              text("INSERT INTO user_embeddings (userId, embedding, updatedAt) VALUES (:userId, :emb, CURRENT_TIMESTAMP)"),
              {"userId": req.userId, "emb": json.dumps(init_emb)}
          )
          db.commit()
          user_emb = np.array(init_emb)
      else:
          # Simple json format string list parsing
          import json
          try:
              user_emb = np.array(json.loads(res_user[0]))
          except Exception:
              # Fallback in case of raw array string
              user_emb = np.array(get_random_vector())

      # 2. Fetch all streamable tracks
      res_tracks = db.execute(
          text("SELECT id, title, artistId, popularity FROM tracks WHERE streamable = 1 OR streamable = true")
      ).fetchall()

      if len(res_tracks) < 2:
          raise HTTPException(status_code=404, detail="Not enough tracks in database")

      # 3. Resolve track features or mock them if empty (ensuring every track has a vector)
      tracks_list = []
      for row in res_tracks:
          track_id = row[0]
          res_feat = db.execute(
              text("SELECT features FROM track_features WHERE trackId = :trackId"),
              {"trackId": track_id}
          ).fetchone()
          
          if not res_feat:
              # Generate deterministic mock features based on track popularity/hash
              np.random.seed(hash(track_id) % (2**32))
              feat = get_random_vector()
              import json
              db.execute(
                  text("INSERT INTO track_features (trackId, features, updatedAt) VALUES (:trackId, :feat, CURRENT_TIMESTAMP)"),
                  {"trackId": track_id, "feat": json.dumps(feat)}
              )
              db.commit()
              track_feat = np.array(feat)
          else:
              import json
              track_feat = np.array(json.loads(res_feat[0]))

          tracks_list.append({
              "id": track_id,
              "features": track_feat,
              "popularity": row[3]
          })

      # 4. Generate Contextualized Contrastive Pair (Safe vs. Exploratory)
      similarities = []
      time_of_day = req.context.get("timeOfDay") if req.context else None

      for t in tracks_list:
          dot_product = np.dot(user_emb, t["features"])
          norm_user = np.linalg.norm(user_emb)
          norm_track = np.linalg.norm(t["features"])
          cos_sim = dot_product / (norm_user * norm_track) if (norm_user > 0 and norm_track > 0) else 0
          
          # Apply Contextual Boosts based on time-of-day and simulated track genre/artist
          # Lofi Dreamer matches Morning, Acoustic Soul matches Afternoon, Neon Horizon matches Night/Evening
          boost = 0.0
          if time_of_day:
              # Query track details to determine match
              track_row = db.execute(
                  text("SELECT artistId FROM tracks WHERE id = :id"),
                  {"id": t["id"]}
              ).fetchone()
              if track_row:
                  artist_row = db.execute(
                      text("SELECT name FROM artists WHERE id = :id"),
                      {"id": track_row[0]}
                  ).fetchone()
                  if artist_row:
                      artist_name = artist_row[0]
                      if time_of_day == "morning" and artist_name == "Lofi Dreamer":
                          boost = 0.15
                      elif time_of_day == "afternoon" and artist_name == "Acoustic Soul":
                          boost = 0.15
                      elif time_of_day in ["evening", "night"] and artist_name == "Neon Horizon":
                          boost = 0.15
                          
          similarities.append((t, cos_sim + boost))

      # Sort by similarity + boost descending
      similarities.sort(key=lambda x: x[1], reverse=True)

      # Pick a safe candidate from top 30% similar tracks
      top_pool_size = max(1, int(len(similarities) * 0.3))
      safe_item = random.choice(similarities[:top_pool_size])[0]

      # Pick an exploratory candidate from middle/lower pool
      exploratory_pool = similarities[top_pool_size:]
      if not exploratory_pool:
          exploratory_pool = similarities

      exploratory_item = random.choice(exploratory_pool)[0]

      # Prevent identical duplicates
      if safe_item["id"] == exploratory_item["id"]:
          remaining = [t for t in tracks_list if t["id"] != safe_item["id"]]
          if remaining:
              exploratory_item = random.choice(remaining)

      return {
          "candidateAId": safe_item["id"],
          "candidateBId": exploratory_item["id"],
          "rationale": "Contrastive Pair: Cosine Safe vs. Exploratory Exploration"
      }
    finally:
      db.close()

@app.post("/reco/events/choice")
def record_choice(req: ChoiceRequest):
    db = SessionLocal()
    try:
      # 1. Fetch user embedding
      res_user = db.execute(
          text("SELECT embedding FROM user_embeddings WHERE userId = :userId"),
          {"userId": req.userId}
      ).fetchone()

      if not res_user:
          raise HTTPException(status_code=404, detail="User embedding not initialized")

      import json
      user_emb = np.array(json.loads(res_user[0]))

      # 2. Fetch chosen and rejected track features
      res_chosen = db.execute(
          text("SELECT features FROM track_features WHERE trackId = :trackId"),
          {"trackId": req.chosenTrackId}
      ).fetchone()

      res_rejected = db.execute(
          text("SELECT features FROM track_features WHERE trackId = :trackId"),
          {"trackId": req.rejectedTrackId}
      ).fetchone()

      if not res_chosen or not res_rejected:
          raise HTTPException(status_code=404, detail="Track features not found")

      chosen_feat = np.array(json.loads(res_chosen[0]))
      rejected_feat = np.array(json.loads(res_rejected[0]))

      # 3. Apply Bradley-Terry Online Preference Update (Gradient Step)
      # Nudge user taste embedding closer to chosen track features and away from rejected track features
      learning_rate = 0.05
      
      # Direction vector: pull towards chosen, push away from rejected
      direction = chosen_feat - rejected_feat
      new_emb = user_emb + learning_rate * direction

      # Re-normalize vector
      norm = np.linalg.norm(new_emb)
      new_emb_normalized = (new_emb / (norm if norm > 0 else 1)).tolist()

      # 4. Save updated user embedding
      db.execute(
          text("UPDATE user_embeddings SET embedding = :emb, updatedAt = CURRENT_TIMESTAMP WHERE userId = :userId"),
          {"userId": req.userId, "emb": json.dumps(new_emb_normalized)}
      )
      db.commit()

      return {"status": "updated", "userId": req.userId}
    finally:
      db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
