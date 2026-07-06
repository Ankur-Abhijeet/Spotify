import os
import json
import logging
import numpy as np
from sqlalchemy import create_engine, text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("batch-retraining")

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "db.sqlite"))
    DATABASE_URL = f"sqlite:///{sqlite_path}"

logger.info(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

def run_retraining():
    conn = engine.connect()
    try:
        # 1. Fetch all choice events
        # We look for events that have chosenTrackId and rejectedTrackId
        events = conn.execute(
            text("SELECT id, userId, chosenTrackId, rejectedTrackId FROM discovery_events WHERE chosenTrackId IS NOT NULL AND rejectedTrackId IS NOT NULL")
        ).fetchall()

        if not events:
            logger.info("No discovery events found. Skipping batch retraining.")
            return

        logger.info(f"Retraining starting. Processing {len(events)} discovery events...")

        # Group events by user
        user_events = {}
        for event in events:
            user_id = event[1]
            if user_id not in user_events:
                user_events[user_id] = []
            user_events[user_id].append({
                "chosen": event[2],
                "rejected": event[3]
            })

        # Process each user
        for user_id, choices in user_events.items():
            # Fetch current user embedding
            res_user = conn.execute(
                text("SELECT embedding FROM user_embeddings WHERE userId = :userId"),
                {"userId": user_id}
            ).fetchone()

            if not res_user:
                logger.info(f"Embedding not initialized for user {user_id}. Skipping.")
                continue

            current_emb = np.array(json.loads(res_user[0]))
            updated_emb = current_emb.copy()

            # For each choice, apply Bradley-Terry online gradient step
            # user_emb = user_emb + learning_rate * (chosen_feat - rejected_feat)
            learning_rate = 0.05
            for choice in choices:
                # Fetch features
                res_chosen = conn.execute(
                    text("SELECT features FROM track_features WHERE trackId = :trackId"),
                    {"trackId": choice["chosen"]}
                ).fetchone()

                res_rejected = conn.execute(
                    text("SELECT features FROM track_features WHERE trackId = :trackId"),
                    {"trackId": choice["rejected"]}
                ).fetchone()

                if res_chosen and res_rejected:
                    chosen_feat = np.array(json.loads(res_chosen[0]))
                    rejected_feat = np.array(json.loads(res_rejected[0]))
                    
                    direction = chosen_feat - rejected_feat
                    updated_emb += learning_rate * direction

            # Normalize the updated vector
            norm = np.linalg.norm(updated_emb)
            if norm > 0:
                updated_emb = updated_emb / norm
            else:
                updated_emb = current_emb # Keep old if degenerate

            # Safety Guard: check if shift is abnormally massive (e.g. average cosine distance is huge)
            cosine_dist = 1.0 - np.dot(current_emb, updated_emb) / (np.linalg.norm(current_emb) * np.linalg.norm(updated_emb))
            if cosine_dist > 0.8:
                logger.warning(f"Abnormally high taste drift detected for user {user_id} ({cosine_dist:.4f}). Guard triggered: skipping update.")
                continue

            # Update database
            conn.execute(
                text("UPDATE user_embeddings SET embedding = :emb, updatedAt = CURRENT_TIMESTAMP WHERE userId = :userId"),
                {"userId": user_id, "emb": json.dumps(updated_emb.tolist())}
            )
            logger.info(f"Updated taste embedding vector for user {user_id} (taste drift: {cosine_dist:.4f})")

        conn.commit()
        logger.info("Batch retraining completed successfully.")
    except Exception as e:
        logger.error(f"Retraining job encountered an error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_retraining()
