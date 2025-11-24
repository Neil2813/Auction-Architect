"""
selector.py

Uses scoring + stadium RAG (and optional ML model) to choose:
  - Starting XI
  - Impact player

Constraints:
  - At least 1 wicket-keeper (if available in team)
  - Specialist bowlers (Paying_Role == "Bowling"):
      - Minimum 4
      - Maximum 6
  - If there are exactly 4 specialist bowlers:
      - Minimum 2 all rounders (Paying_Role == "All rounder")
  - Max `max_overseas` overseas players (default 4)
"""

from typing import Tuple, Optional, Dict, Any

import pandas as pd

from .scoring import compute_scores_for_team
from .stadiums import get_pitch_info_smart


MIN_SPECIAL_BOWLERS = 4
MAX_SPECIAL_BOWLERS = 6
MIN_ALLROUNDERS_IF_4 = 2


def _recompute_counts(xi_df: pd.DataFrame) -> Dict[str, int]:
    """
    Helper to recompute role/flag counts for the current XI.
    """
    return {
        "bowlers": int(xi_df["is_bowler_spec"].sum()),
        "allrounders": int(xi_df["is_allrounder"].sum()),
        "keepers": int(xi_df["is_keeper"].sum()),
        "overseas": int(xi_df["is_overseas"].sum()),
    }


def select_starting_xi(
    players_df: pd.DataFrame,
    team_code: str,
    venue_query: str,
    toss_decision: str,
    model_bundle: Optional[Dict[str, Any]] = None,
    max_overseas: int = 4,
) -> Tuple[pd.DataFrame, Optional[pd.Series], str, str]:
    """
    Returns:
      - xi_df: DataFrame of 11 players with final_score
      - impact_row: Series for chosen impact player (or None)
      - pitch_type: 'batting' / 'bowling' / 'balanced'
      - pitch_notes: textual description of the pitch
    """

    # 1) Resolve pitch context
    pitch_info = get_pitch_info_smart(venue_query)
    if pitch_info is None:
        pitch_type = "balanced"
        pitch_notes = "Unknown venue; using 'balanced' as default."
    else:
        pitch_type = pitch_info["pitch_type"]
        pitch_notes = pitch_info["notes"]

    # 2) Compute scores for all players of the team (after any squad filter)
    df_team = compute_scores_for_team(
        players_df=players_df,
        team_code=team_code,
        pitch_type=pitch_type,
        toss_decision=toss_decision,
        model_bundle=model_bundle,
    )

    if df_team.empty:
        # Nothing to pick, return empty
        return df_team, None, pitch_type, pitch_notes

    # 3) Role flags
    df_team = df_team.copy()
    df_team["role"] = df_team["Paying_Role"].astype(str).str.strip()
    df_team["is_bowler_spec"] = df_team["role"] == "Bowling"
    df_team["is_allrounder"] = df_team["role"] == "All rounder"

    # 4) Initial XI:
    #    - Lock top keeper (if available)
    #    - Fill remaining by best final_score under overseas cap
    selected_names = []
    overseas_count = 0

    # Keeper first (if any)
    keepers = df_team[df_team["is_keeper"]].sort_values("final_score", ascending=False)
    if not keepers.empty:
        k = keepers.iloc[0]
        selected_names.append(k["Player"])
        if k["is_overseas"]:
            overseas_count += 1

    # Fill rest by score while respecting overseas limit
    for _, row in df_team.sort_values("final_score", ascending=False).iterrows():
        if len(selected_names) >= 11:
            break
        name = row["Player"]
        if name in selected_names:
            continue
        if row["is_overseas"] and overseas_count >= max_overseas:
            continue
        selected_names.append(name)
        if row["is_overseas"]:
            overseas_count += 1

    xi_df = df_team[df_team["Player"].isin(selected_names)].copy()
    xi_df = xi_df.sort_values("final_score", ascending=False)
    remaining = df_team[~df_team["Player"].isin(selected_names)].copy()

    # If somehow we still have < 11 (not enough players), just proceed with what we have
    if xi_df.empty:
        return xi_df, None, pitch_type, pitch_notes

    # 5) Enforce bowler count constraints (min 4, max 6)
    # We do this via swaps between XI and remaining, while respecting overseas cap
    max_iters = 20  # safety to avoid infinite loops
    for _ in range(max_iters):
        counts = _recompute_counts(xi_df)
        bowler_count = counts["bowlers"]
        overseas_count = counts["overseas"]

        changed = False

        # Case A: too few specialist bowlers (< 4) → bring in bowlers
        if bowler_count < MIN_SPECIAL_BOWLERS:
            needed = MIN_SPECIAL_BOWLERS - bowler_count

            # All available bowlers not in XI
            bowlers_remaining = remaining[remaining["is_bowler_spec"]].sort_values(
                "final_score", ascending=False
            )
            if bowlers_remaining.empty:
                # Can't fix any further
                break

            for _n in range(needed):
                # Recompute each time in case we've updated
                counts = _recompute_counts(xi_df)
                bowler_count = counts["bowlers"]
                overseas_count = counts["overseas"]
                if bowler_count >= MIN_SPECIAL_BOWLERS:
                    break

                bowlers_remaining = remaining[remaining["is_bowler_spec"]].sort_values(
                    "final_score", ascending=False
                )
                if bowlers_remaining.empty:
                    break

                in_row = bowlers_remaining.iloc[0]

                # Candidate outs: non-bowlers, not keepers, weakest first
                candidates_out = xi_df[
                    (~xi_df["is_bowler_spec"]) & (~xi_df["is_keeper"])
                ].sort_values("final_score", ascending=True)

                swapped = False
                for _, out_row in candidates_out.iterrows():
                    overseas_after = (
                        overseas_count
                        - int(out_row["is_overseas"])
                        + int(in_row["is_overseas"])
                    )
                    if overseas_after <= max_overseas:
                        in_name = in_row["Player"]
                        out_name = out_row["Player"]

                        # Swap in → XI
                        xi_df = xi_df[xi_df["Player"] != out_name]
                        xi_df = pd.concat(
                            [xi_df, in_row.to_frame().T], ignore_index=True
                        ).sort_values("final_score", ascending=False)

                        # Swap out → remaining
                        remaining = remaining[remaining["Player"] != in_name]
                        remaining = pd.concat(
                            [remaining, out_row.to_frame().T], ignore_index=True
                        )

                        changed = True
                        swapped = True
                        break

                if not swapped:
                    # Can't find valid swap respecting overseas cap
                    break

        # Case B: too many specialist bowlers (> 6) → replace some with non-bowlers
        elif bowler_count > MAX_SPECIAL_BOWLERS:
            excess = bowler_count - MAX_SPECIAL_BOWLERS

            bowlers_in = xi_df[
                xi_df["is_bowler_spec"] & (~xi_df["is_keeper"])
            ].sort_values("final_score", ascending=True)  # remove weakest bowlers first

            if bowlers_in.empty:
                break

            for _n in range(excess):
                counts = _recompute_counts(xi_df)
                bowler_count = counts["bowlers"]
                overseas_count = counts["overseas"]
                if bowler_count <= MAX_SPECIAL_BOWLERS:
                    break

                bowlers_in = xi_df[
                    xi_df["is_bowler_spec"] & (~xi_df["is_keeper"])
                ].sort_values("final_score", ascending=True)
                if bowlers_in.empty:
                    break

                out_row = bowlers_in.iloc[0]

                # Non-bowlers remaining, best-first
                non_bowlers_remaining = remaining[
                    ~remaining["is_bowler_spec"]
                ].sort_values("final_score", ascending=False)

                swapped = False
                for _, in_row in non_bowlers_remaining.iterrows():
                    overseas_after = (
                        overseas_count
                        - int(out_row["is_overseas"])
                        + int(in_row["is_overseas"])
                    )
                    if overseas_after <= max_overseas:
                        in_name = in_row["Player"]
                        out_name = out_row["Player"]

                        # Swap
                        xi_df = xi_df[xi_df["Player"] != out_name]
                        xi_df = pd.concat(
                            [xi_df, in_row.to_frame().T], ignore_index=True
                        ).sort_values("final_score", ascending=False)

                        remaining = remaining[remaining["Player"] != in_name]
                        remaining = pd.concat(
                            [remaining, out_row.to_frame().T], ignore_index=True
                        )

                        changed = True
                        swapped = True
                        break

                if not swapped:
                    break

        else:
            # Already within [4, 6] range for bowlers
            break

        if not changed:
            # No more adjustments possible
            break

    # 6) Enforce allrounder rule: if exactly 4 bowlers, need at least 2 allrounders
    counts = _recompute_counts(xi_df)
    bowler_count = counts["bowlers"]
    allrounder_count = counts["allrounders"]
    overseas_count = counts["overseas"]

    if bowler_count == MIN_SPECIAL_BOWLERS and allrounder_count < MIN_ALLROUNDERS_IF_4:
        needed_ar = MIN_ALLROUNDERS_IF_4 - allrounder_count

        for _ in range(needed_ar):
            counts = _recompute_counts(xi_df)
            allrounder_count = counts["allrounders"]
            overseas_count = counts["overseas"]
            if allrounder_count >= MIN_ALLROUNDERS_IF_4:
                break

            allrounders_remaining = remaining[
                remaining["is_allrounder"]
            ].sort_values("final_score", ascending=False)
            if allrounders_remaining.empty:
                break

            in_row = allrounders_remaining.iloc[0]

            # Candidate outs: players that are NOT allrounders, NOT bowlers, NOT keepers
            # (i.e., pure batters / others)
            candidates_out = xi_df[
                (~xi_df["is_allrounder"])
                & (~xi_df["is_bowler_spec"])
                & (~xi_df["is_keeper"])
            ].sort_values("final_score", ascending=True)

            if candidates_out.empty:
                # Can't add more allrounders without breaking bowler / keeper constraints
                break

            swapped = False
            for _, out_row in candidates_out.iterrows():
                overseas_after = (
                    overseas_count
                    - int(out_row["is_overseas"])
                    + int(in_row["is_overseas"])
                )
                if overseas_after <= max_overseas:
                    in_name = in_row["Player"]
                    out_name = out_row["Player"]

                    xi_df = xi_df[xi_df["Player"] != out_name]
                    xi_df = pd.concat(
                        [xi_df, in_row.to_frame().T], ignore_index=True
                    ).sort_values("final_score", ascending=False)

                    remaining = remaining[remaining["Player"] != in_name]
                    remaining = pd.concat(
                        [remaining, out_row.to_frame().T], ignore_index=True
                    )

                    swapped = True
                    break

            if not swapped:
                break

    # 7) Ensure at least 1 keeper if team has a keeper at all
    counts = _recompute_counts(xi_df)
    keeper_count = counts["keepers"]

    if keeper_count == 0:
        team_has_keeper = not df_team[df_team["is_keeper"]].empty
        if team_has_keeper:
            # Force best keeper into XI by swapping out weakest non-keeper
            best_keeper = (
                df_team[df_team["is_keeper"]]
                .sort_values("final_score", ascending=False)
                .iloc[0]
            )

            if best_keeper["Player"] not in xi_df["Player"].values:
                overseas_count = counts["overseas"]

                candidates_out = xi_df[~xi_df["is_keeper"]].sort_values(
                    "final_score", ascending=True
                )

                for _, out_row in candidates_out.iterrows():
                    overseas_after = (
                        overseas_count
                        - int(out_row["is_overseas"])
                        + int(best_keeper["is_overseas"])
                    )
                    if overseas_after <= max_overseas:
                        in_name = best_keeper["Player"]
                        out_name = out_row["Player"]

                        xi_df = xi_df[xi_df["Player"] != out_name]
                        xi_df = pd.concat(
                            [xi_df, best_keeper.to_frame().T], ignore_index=True
                        ).sort_values("final_score", ascending=False)

                        remaining = remaining[remaining["Player"] != in_name]
                        remaining = pd.concat(
                            [remaining, out_row.to_frame().T], ignore_index=True
                        )
                        break

    # 8) Final XI sorted by score
    xi_df = xi_df.sort_values("final_score", ascending=False)

    # 9) Impact player from remaining pool
    remaining = df_team[~df_team["Player"].isin(xi_df["Player"])].copy()
    impact_row: Optional[pd.Series] = None

    if not remaining.empty:
        if pitch_type == "bowling":
            preferred = remaining[
                remaining["role"].isin(["Bowling", "All rounder"])
            ].sort_values("final_score", ascending=False)
        else:
            preferred = remaining[
                remaining["role"].isin(["Batting", "All rounder"])
            ].sort_values("final_score", ascending=False)

        if preferred.empty:
            impact_row = remaining.sort_values(
                "final_score", ascending=False
            ).iloc[0]
        else:
            impact_row = preferred.iloc[0]

    return xi_df, impact_row, pitch_type, pitch_notes
