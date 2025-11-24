# main.py

from fastapi import FastAPI, HTTPException
from typing import Optional
import os
import pandas as pd
import numpy as np

from fastapi.middleware.cors import CORSMiddleware

from src.model import AuctionPriceModel, train_full_model
from src.features import load_and_prepare_master
from src.squad import select_squad
from src.config import MODEL_DIR, PREDICTION_YEAR

app = FastAPI(
    title="Auction ML Backend",
    description="Hybrid LightGBM + KNN model for player price & squad selection (locked to 2025 predictions)",
    version="1.0.0",
)

# --- CORS so React (Vite) can call this API ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev: open to all; you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance reused across requests
model = AuctionPriceModel()


def model_files_exist() -> bool:
    required = [
        os.path.join(MODEL_DIR, "lgbm_price_model.joblib"),
        os.path.join(MODEL_DIR, "knn_price_model.joblib"),
        os.path.join(MODEL_DIR, "feature_columns.joblib"),
        os.path.join(MODEL_DIR, "eff_threshold.joblib"),
    ]
    return all(os.path.exists(p) for p in required)


@app.on_event("startup")
def load_model_if_available() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)

    if model_files_exist():
        try:
            model.load()
            print("✅ Loaded pretrained models from disk.")
        except Exception as e:
            print("⚠️ Error while loading models on startup:", e)
    else:
        print("⚠️ No pretrained models found. Call /train first.")


@app.post("/train")
def train_endpoint():
    try:
        preds_df = train_full_model()

        sold_mask = preds_df["final_price"] > 0
        sold = preds_df.loc[sold_mask]

        rmse_info = {}
        if not sold.empty:
            from sklearn.metrics import mean_squared_error
            import math

            rmse = math.sqrt(
                mean_squared_error(
                    sold["final_price"],
                    sold["predicted_price"],
                )
            )
            rmse_info["rmse_on_sold"] = rmse

        return {
            "status": "ok",
            "message": "Model trained and saved to models/ directory.",
            "rows_trained_on": int(sold_mask.sum()),
            **rmse_info,
        }
    except Exception as e:
        print("❌ Error in /train:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/players/2025")
def get_player_2025(name: str):
    if not model_files_exist():
        raise HTTPException(
            status_code=400,
            detail="Models not trained yet. Call /train first.",
        )

    try:
        model.load()

        master_df = load_and_prepare_master()
        preds_df = model.predict_prices(master_df)

        year_df = preds_df[preds_df["year"] == PREDICTION_YEAR].copy()
        if year_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No players found for prediction year {PREDICTION_YEAR}.",
            )

        mask = year_df["name"].str.lower() == name.lower()
        player_df = year_df[mask]

        if player_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Player '{name}' not found for year {PREDICTION_YEAR}.",
            )

        row = player_df.iloc[0]

        outcome = row["predicted_auction_outcome"]
        predicted_price = (
            float(row["predicted_price"]) if outcome == "SOLD" else None
        )

        base_price = (
            float(row["base_price"])
            if "base_price" in row and not pd.isna(row["base_price"])
            else None
        )

        impact_score = (
            float(row["impact_score"])
            if "impact_score" in row and not pd.isna(row["impact_score"])
            else None
        )

        efficiency_score = (
            float(row["efficiency_score"])
            if "efficiency_score" in row and not pd.isna(row["efficiency_score"])
            else None
        )

        return {
            "name": row["name"],
            "year": int(row["year"]),
            "base_price": base_price,
            "predicted_auction_outcome": outcome,
            "predicted_price": predicted_price,
            "impact_score": impact_score,
            "efficiency_score": efficiency_score,
        }
    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error in /players/2025:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/players/2025/table")
def get_players_2025_table():
    """
    Return ALL 2025 players for the Auction table.
    """
    if not model_files_exist():
        raise HTTPException(
            status_code=400,
            detail="Models not trained yet. Call /train first.",
        )

    try:
        model.load()

        master_df = load_and_prepare_master()
        preds_df = model.predict_prices(master_df)

        year_df = preds_df[preds_df["year"] == PREDICTION_YEAR].copy()
        if year_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No players found for prediction year {PREDICTION_YEAR}.",
            )

        def to_crore(x):
            if pd.isna(x):
                return None
            try:
                return float(x) / 1e7
            except Exception:
                return None

        if "base_price" in year_df.columns:
            year_df["base_price_cr"] = year_df["base_price"].apply(to_crore)
        else:
            year_df["base_price_cr"] = None

        if "predicted_price" in year_df.columns:
            year_df["predicted_price_cr"] = year_df["predicted_price"].apply(
                to_crore
            )
        else:
            year_df["predicted_price_cr"] = None

        out_cols = [
            "name",
            "role",
            "country_bucket",
            "base_price_cr",
            "predicted_price_cr",
            "impact_score",
            "efficiency_score",
            "predicted_auction_outcome",
        ]
        out_cols = [c for c in out_cols if c in year_df.columns]

        raw_players = year_df[out_cols].to_dict(orient="records")

        players = []
        for rec in raw_players:
            clean = {}
            for k, v in rec.items():
                if isinstance(v, (np.integer,)):
                    clean[k] = int(v)
                elif isinstance(v, (np.floating, float)):
                    clean[k] = None if pd.isna(v) else float(v)
                elif isinstance(v, pd.Timestamp):
                    clean[k] = v.isoformat()
                else:
                    # plain Python types (str, bool, None, etc.) pass through
                    clean[k] = v
            players.append(clean)

        return {
            "year": int(PREDICTION_YEAR),
            "players": players,
        }

    except Exception as e:
        print("❌ Error in /players/2025/table:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/squad/2025")
def get_squad_2025(
    total_purse: float = 500_000_000,
    squad_size: int = 9,
    max_overseas: int = 3,
    min_overseas: int = 1,
):
    if not model_files_exist():
        raise HTTPException(
            status_code=400,
            detail="Models not trained yet. Call /train first.",
        )

    try:
        model.load()

        master_df = load_and_prepare_master()
        preds_df = model.predict_prices(master_df)

        squad_df = select_squad(
            preds_df,
            year=PREDICTION_YEAR,
            total_purse=total_purse,
            squad_size=squad_size,
            max_overseas=max_overseas,
            min_overseas=min_overseas,
        )

        total_spent = float(squad_df["predicted_price"].sum())

        return {
            "year": PREDICTION_YEAR,
            "squad_size": int(len(squad_df)),
            "total_spent": total_spent,
            "purse_remaining": float(total_purse - total_spent),
            "overseas_count": int(
                (squad_df["country_bucket"] == "Overseas").sum()
            ),
            "min_overseas_target": min_overseas,
            "max_overseas": max_overseas,
            "players": squad_df[
                [
                    "name",
                    "country_bucket",
                    "role",
                    "predicted_price",
                    "impact_score",
                    "efficiency_score",
                ]
            ].to_dict(orient="records"),
        }
    except Exception as e:
        print("❌ Error in /squad/2025:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Auction ML API is running."}
