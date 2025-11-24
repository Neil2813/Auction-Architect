"""
main.py

FastAPI entrypoint for:
- training the ML model
- predicting Starting XI + Impact player

Run with:
    uvicorn main:app --reload
"""

from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import TEAM_CODES
from app.scoring import load_players_stats
from app.selector import select_starting_xi
from app.model_service import train_player_score_model, load_player_score_model
from app.schemas import (
    PredictXIRequest,
    PredictXIResponse,
    PlayerOut,
    TrainResponse,
)

app = FastAPI(
    title="IPL Starting XI Predictor",
    description="Predict starting XI + Impact player using hybrid rules + ML + RAG.",
    version="1.0.0",
)

# -------------------------------------------------------------------
# ✅ CORS: allow React Frontend to call this API
# -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to ["http://localhost:5173"] later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Global in-memory state
# -------------------------------------------------------------------
players_df = None
model_bundle = {}  # {"model": ..., "feature_cols": [...]}


@app.on_event("startup")
def startup_event():
    """Load player stats + trained model into memory on startup."""
    global players_df, model_bundle
    players_df = load_players_stats()
    model_bundle = load_player_score_model()


@app.get("/")
def root():
    return {
        "message": "IPL Starting XI Predictor is running. Visit /docs for interactive API docs."
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# -------------------------------------------------------------------
# 🚀 Train Model
# -------------------------------------------------------------------
@app.post("/train-model", response_model=TrainResponse)
def train_model():
    """
    Train the player score ML model and save it to disk.
    Uses merged (base + current season) player stats.
    """
    global players_df, model_bundle

    if players_df is None:
        players_df = load_players_stats()

    model_bundle = train_player_score_model(players_df)

    return TrainResponse(
        message="Model trained and saved successfully.",
        used_players=len(players_df),
    )


# -------------------------------------------------------------------
# 🎯 Predict Starting XI + Impact Player
# -------------------------------------------------------------------
@app.post("/predict-xi", response_model=PredictXIResponse)
def predict_xi(payload: PredictXIRequest):
    """
    Predict starting XI + Impact player for:
    - team_code
    - venue (any partial name, e.g. "chepauk", "wankhede")
    - toss_decision ("bat" / "bowl")
    """

    global players_df, model_bundle

    team_code = payload.team_code.upper()
    if team_code not in TEAM_CODES:
        raise HTTPException(status_code=400, detail=f"Unknown team_code: {team_code}")

    if players_df is None:
        players_df = load_players_stats()

    xi_df, impact_row, pitch_type, pitch_notes = select_starting_xi(
        players_df=players_df,
        team_code=team_code,
        venue_query=payload.venue,
        toss_decision=payload.toss_decision.lower(),
        model_bundle=model_bundle if model_bundle else None,
    )

    # Format response
    starting_xi: List[PlayerOut] = []
    for _, row in xi_df.iterrows():
        starting_xi.append(
            PlayerOut(
                name=row["Player"],
                country=row["COUNTRY"],
                role=row["Paying_Role"],
                final_score=float(row["final_score"]),
            )
        )

    impact_player = None
    if impact_row is not None:
        impact_player = PlayerOut(
            name=impact_row["Player"],
            country=impact_row["COUNTRY"],
            role=impact_row["Paying_Role"],
            final_score=float(impact_row["final_score"]),
        )

    return PredictXIResponse(
        team_code=team_code,
        venue=payload.venue,
        pitch_type=pitch_type,
        pitch_notes=pitch_notes,
        starting_xi=starting_xi,
        impact_player=impact_player,
    )
