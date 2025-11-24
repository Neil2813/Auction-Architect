"""
model_service.py

Simple ML model training using player stats.
We use rule-based scores as pseudo-labels and train a regressor.
"""

from typing import Dict, Any

import numpy as np
import pandas as pd
from joblib import dump, load
from sklearn.ensemble import RandomForestRegressor

from .config import PLAYER_SCORE_MODEL_PATH
from .scoring import compute_player_score


def train_player_score_model(players_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Train a simple RandomForestRegressor to approximate our rule-based score.
    The idea: use it later instead of computing the rule manually for each call.
    """

    df = players_df.copy()

    # Features (you can tweak / add more)
    feature_cols = [
        "AGE",
        "Mat",
        "Inns",
        "Runs",
        "BF",
        "SR",
        "Avg",
        "4s",
        "6s",
        "B_Inns",
        "B_Balls",
        "B_Wkts",
        "B_Econ",
        "SOLD_PRICE_CR",
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]

    # Build target as rule-based score on neutral context
    df["target_score"] = df.apply(
        lambda r: compute_player_score(r, pitch_type="balanced", toss_decision="bat"),
        axis=1,
    )

    # Ensure numeric & finite; drop rows with bad target
    df["target_score"] = pd.to_numeric(df["target_score"], errors="coerce")
    mask = np.isfinite(df["target_score"].values)
    dropped = (~mask).sum()
    if dropped > 0:
        print(f"[INFO] Dropping {dropped} rows with invalid target_score before training.")

    df = df[mask]

    if df.empty:
        raise ValueError(
            "No valid rows for training after cleaning target_score. "
            "Check your input CSVs for valid numeric stats."
        )

    X = df[feature_cols].fillna(0.0)
    y = df["target_score"].values

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    bundle = {"model": model, "feature_cols": feature_cols}

    PLAYER_SCORE_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    dump(bundle, PLAYER_SCORE_MODEL_PATH)

    return bundle


def load_player_score_model() -> Dict[str, Any]:
    """
    Load model bundle {model, feature_cols} if exists; else return {}.
    """
    try:
        bundle = load(PLAYER_SCORE_MODEL_PATH)
        if not isinstance(bundle, dict):
            return {}
        return bundle
    except FileNotFoundError:
        return {}
    except Exception as exc:
        print(f"[WARN] Failed to load player score model: {exc}")
        return {}
