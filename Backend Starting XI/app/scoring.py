"""
scoring.py

Loads player stats and provides scoring functions.
Uses:
- base stats from IPL_dataset_final.csv
- optional current-season stats from IPL_current_season_stats.csv
If current-season data is present for (TEAM, Player), it overrides base stats.

Also supports an optional PLAYERS_XI_CSV (players.csv) that lists
current squads per team. If present, selection is restricted to those
players for each team; otherwise, all players in the stats file are used.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, Any as AnyType

from .config import (
    PLAYERS_STATS_CSV,
    CURRENT_SEASON_STATS_CSV,
    WICKET_KEEPERS,
    PLAYERS_XI_CSV,
)


def _clean_players_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    non_numeric = ["Player", "COUNTRY", "TEAM", "Paying_Role", "SOLD_PRICE"]
    numeric_cols = [c for c in df.columns if c not in non_numeric]

    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    def parse_price_to_crore(x):
        if isinstance(x, str):
            x = x.strip().lower().replace("cr", "")
            try:
                return float(x)
            except ValueError:
                return np.nan
        return np.nan

    if "SOLD_PRICE" in df.columns:
        df["SOLD_PRICE_CR"] = df["SOLD_PRICE"].apply(parse_price_to_crore)
    else:
        df["SOLD_PRICE_CR"] = np.nan

    return df


def load_players_stats() -> pd.DataFrame:
    """
    Final player stats DataFrame:
      base stats + current-season override if file exists.
    """
    base_df = pd.read_csv(PLAYERS_STATS_CSV)
    base_df = _clean_players_df(base_df)

    current_path: Path = CURRENT_SEASON_STATS_CSV
    if current_path.exists():
        current_df = pd.read_csv(current_path)
        current_df = _clean_players_df(current_df)

        base_key = ["TEAM", "Player"]

        if all(k in base_df.columns for k in base_key) and all(
            k in current_df.columns for k in base_key
        ):
            merged_keys = current_df[base_key].drop_duplicates()
            base_no_overlap = base_df.merge(
                merged_keys,
                on=base_key,
                how="left",
                indicator=True,
            )
            base_no_overlap = base_no_overlap[base_no_overlap["_merge"] == "left_only"]
            base_no_overlap = base_no_overlap.drop(columns=["_merge"])

            final_df = pd.concat([base_no_overlap, current_df], ignore_index=True)
        else:
            print(
                "[WARN] CURRENT_SEASON_STATS_CSV exists but missing TEAM/Player columns. "
                "Using only base stats."
            )
            final_df = base_df
    else:
        final_df = base_df

    return final_df


def _safe_numeric(val: AnyType) -> float:
    """
    Convert to float, returning 0.0 if None, NaN, or non-numeric.
    Ensures we don't leak NaNs into target scores.
    """
    try:
        if val is None:
            return 0.0
        v = float(val)
        if np.isnan(v):
            return 0.0
        return v
    except Exception:
        return 0.0


def compute_player_score(row: pd.Series, pitch_type: str, toss_decision: str) -> float:
    """
    Rule-based score for a player given pitch + toss context.
    NaN-safe: always returns a finite float.
    """

    # Batting stats
    avg = _safe_numeric(row.get("Avg", 0.0))
    sr = _safe_numeric(row.get("SR", 0.0))
    runs = _safe_numeric(row.get("Runs", 0.0))
    inns = _safe_numeric(row.get("Inns", 0.0))
    runs_per_inns = runs / inns if inns > 0 else 0.0

    batting_score_raw = 0.5 * avg + 0.2 * sr + 0.3 * runs_per_inns

    # Bowling stats
    b_wkts = _safe_numeric(row.get("B_Wkts", 0.0))
    b_inns = _safe_numeric(row.get("B_Inns", 0.0))

    b_econ_raw = row.get("B_Econ", np.nan)
    try:
        b_econ = float(b_econ_raw)
    except (TypeError, ValueError):
        b_econ = np.nan
    if np.isnan(b_econ):
        b_econ = 999.0  # effectively "bad" economy so doesn't get free boost

    wkts_per_inns = b_wkts / b_inns if b_inns > 0 else 0.0

    bowling_score_raw = wkts_per_inns * 25.0 + max(0.0, 8.0 - b_econ) * 5.0

    # Role weighting
    role = str(row.get("Paying_Role", "") or "").strip()
    if role == "Batting":
        bat_weight = 1.2
        bowl_weight = 0.6
    elif role == "Bowling":
        bat_weight = 0.6
        bowl_weight = 1.2
    else:
        bat_weight = 1.0
        bowl_weight = 1.0

    base_score = bat_weight * batting_score_raw + bowl_weight * bowling_score_raw

    # Pitch adjustment
    if pitch_type == "batting":
        if role == "Batting":
            base_score *= 1.2
        elif role == "Bowling":
            base_score *= 0.9
        else:
            base_score *= 1.05
    elif pitch_type == "bowling":
        if role == "Bowling":
            base_score *= 1.2
        elif role == "Batting":
            base_score *= 0.9
        else:
            base_score *= 1.10

    # Toss + role synergy
    toss_decision = (toss_decision or "").lower()
    if toss_decision == "bat" and role == "Batting":
        base_score *= 1.05
    elif toss_decision == "bowl" and role == "Bowling":
        base_score *= 1.05

    # Captaincy
    cap_exp = _safe_numeric(row.get("CAPTAINCY EXP", 0.0))
    if cap_exp > 0:
        base_score *= 1.02

    # Keeper bonus
    if row.get("Player") in WICKET_KEEPERS:
        base_score *= 1.03

    # Safety: if somehow still NaN or inf, clamp
    if not np.isfinite(base_score):
        return 0.0

    return float(base_score)


def _apply_squad_filter(df_team: pd.DataFrame, team_code: str) -> pd.DataFrame:
    """
    If PLAYERS_XI_CSV exists and has usable columns, restrict df_team
    to only players in the current squad for that team.

    If anything goes wrong, falls back to df_team unchanged.
    """
    path: Path = PLAYERS_XI_CSV
    if not path.exists():
        return df_team

    try:
        squad_df = pd.read_csv(path)
    except Exception as exc:
        print(f"[WARN] Failed to read PLAYERS_XI_CSV: {exc}. Using full team stats.")
        return df_team

    # Detect team column
    team_col = None
    for cand in ["TEAM", "Team", "team"]:
        if cand in squad_df.columns:
            team_col = cand
            break

    # Detect player name column
    name_col = None
    for cand in ["Player", "player", "PLAYER_NAME", "player_name"]:
        if cand in squad_df.columns:
            name_col = cand
            break

    if team_col is None or name_col is None:
        print(
            "[WARN] PLAYERS_XI_CSV missing usable TEAM/Player columns. "
            "Expected one of TEAM/Team/team and Player/player/PLAYER_NAME/player_name. "
            "Using full team stats."
        )
        return df_team

    # Filter squad rows for this team
    squad_df[team_col] = squad_df[team_col].astype(str).str.upper()
    mask_team = squad_df[team_col] == team_code.upper()
    squad_team = squad_df[mask_team]

    if squad_team.empty:
        print(
            f"[WARN] No current squad rows for team {team_code} in PLAYERS_XI_CSV. "
            "Using full team stats."
        )
        return df_team

    squad_names = (
        squad_team[name_col]
        .astype(str)
        .str.strip()
        .dropna()
        .unique()
        .tolist()
    )

    if not squad_names:
        print(
            f"[WARN] Squad list for {team_code} has no valid player names. "
            "Using full team stats."
        )
        return df_team

    df_filtered = df_team[df_team["Player"].isin(squad_names)]

    if df_filtered.empty:
        print(
            f"[WARN] Squad filter for {team_code} produced 0 matches in stats df. "
            "Check name spelling / casing. Using full team stats."
        )
        return df_team

    return df_filtered


def compute_scores_for_team(
    players_df: pd.DataFrame,
    team_code: str,
    pitch_type: str,
    toss_decision: str,
    model_bundle: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """
    Filter to one TEAM and compute final_score:

    - If model_bundle is provided:
        uses trained ML model to predict scores.
    - Otherwise:
        uses rule-based compute_player_score.

    Additionally, if PLAYERS_XI_CSV exists, restricts to the
    current squad for that team.
    """

    # Filter team
    df_team = players_df[players_df["TEAM"] == team_code].copy()

    # Apply current squad filter if players.csv exists
    df_team = _apply_squad_filter(df_team, team_code)

    if df_team.empty:
        # Safety net: still don't break
        print(
            f"[WARN] No players found for TEAM={team_code} after squad filtering. "
            "Prediction will return empty XI."
        )
        return df_team

    # ML model path
    if model_bundle is not None:
        model = model_bundle.get("model")
        feature_cols = model_bundle.get("feature_cols", [])
        if model is not None and feature_cols:
            X = df_team[feature_cols].fillna(0.0)
            df_team["final_score"] = model.predict(X)
        else:
            df_team["final_score"] = df_team.apply(
                lambda r: compute_player_score(r, pitch_type, toss_decision), axis=1
            )
    else:
        df_team["final_score"] = df_team.apply(
            lambda r: compute_player_score(r, pitch_type, toss_decision), axis=1
        )

    # Mark overseas + keeper flags
    df_team["is_overseas"] = df_team["COUNTRY"] != "IND"
    df_team["is_keeper"] = df_team["Player"].isin(WICKET_KEEPERS)

    df_team = df_team.sort_values("final_score", ascending=False)
    return df_team
