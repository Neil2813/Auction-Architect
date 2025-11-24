# src/squad.py

import pandas as pd  # for DataFrame typing


def select_squad(
    df: pd.DataFrame,
    year: int,
    total_purse: float,
    squad_size: int = 9,
    max_overseas: int = 3,
    min_overseas: int = 1,
    role_requirements=None,
) -> pd.DataFrame:
    """
    Select a squad under purse + overseas constraints, using efficiency_score.

    Args:
        df: DataFrame containing predictions and player info.
        year: Auction year to filter on (e.g., PREDICTION_YEAR = 2025).
        total_purse: Total budget (in same units as predicted_price).
        squad_size: Number of players to select.
        max_overseas: Maximum number of overseas players allowed.
        min_overseas: Minimum number of overseas players to target.
        role_requirements: Optional dict of role -> minimum domestic count.
                           Example: {"Batter": 3, "Bowler": 3, "Allrounder": 2}

    Returns:
        squad_df: DataFrame with selected players sorted by efficiency_score.
    """
    if role_requirements is None:
        role_requirements = {
            "Batter": 3,
            "Bowler": 3,
            "Allrounder": 2,
        }

    # Filter players for the given year and only those that the model predicts as SOLD
    candidates = df[
        (df["year"] == year)
        & (df["predicted_auction_outcome"] == "SOLD")
        & df["efficiency_score"].notna()
    ].copy()

    # Sort by efficiency descending
    candidates = candidates.sort_values("efficiency_score", ascending=False)

    selected_rows = []
    spent = 0.0
    overseas_count = 0

    def can_afford(price: float) -> bool:
        return spent + price <= total_purse

    def row_key(r) -> tuple:
        return (r["name"], r["year"])

    # --- Phase 1: ensure MINIMUM overseas players ---
    overseas_candidates = candidates[candidates["country_bucket"] == "Overseas"]

    for _, row in overseas_candidates.iterrows():
        if overseas_count >= min_overseas:
            break  # already satisfied min_overseas

        price = row["predicted_price"]
        if (
            can_afford(price)
            and len(selected_rows) < squad_size
            and overseas_count < max_overseas
        ):
            selected_rows.append(row)
            spent += price
            overseas_count += 1

    # Track selected keys to avoid duplicates later
    selected_keys = {row_key(r) for r in selected_rows}

    # --- Phase 2: role fulfilment with DOMESTIC players ---
    for role, needed in role_requirements.items():
        role_cands = candidates[
            (candidates["country_bucket"] == "Indian")
            & (candidates["role"] == role)
        ]

        for _, row in role_cands.iterrows():
            key = row_key(row)
            price = row["predicted_price"]

            if (
                key not in selected_keys
                and can_afford(price)
                and len(selected_rows) < squad_size
            ):
                selected_rows.append(row)
                selected_keys.add(key)
                spent += price

                if len(selected_rows) >= squad_size:
                    break
        if len(selected_rows) >= squad_size:
            break

    # --- Phase 3: efficiency-based filling with DOMESTIC players ---
    filler_cands = candidates[candidates["country_bucket"] == "Indian"]

    for _, row in filler_cands.iterrows():
        key = row_key(row)
        price = row["predicted_price"]

        if (
            key not in selected_keys
            and can_afford(price)
            and len(selected_rows) < squad_size
        ):
            selected_rows.append(row)
            selected_keys.add(key)
            spent += price

        if len(selected_rows) >= squad_size:
            break

    squad_df = (
        pd.DataFrame(selected_rows)
        .sort_values("efficiency_score", ascending=False)
        .reset_index(drop=True)
    )

    # Simple debug prints (optional)
    print(f"Total players: {len(squad_df)} / {squad_size}")
    print(f"Total spent: {spent}")
    print(f"Purse remaining: {total_purse - spent}")
    print(f"Overseas count: {(squad_df['country_bucket'] == 'Overseas').sum()}")

    return squad_df
