import numpy as np  # numeric arrays
import pandas as pd  # dataframes
from .config import PLAYERS_PATH, MATCH_STATS_PATH, AUCTION_SUMMARY_PATH  # paths


def overs_to_balls_series(s: pd.Series) -> pd.Series:
    s = s.fillna(0)
    overs = np.floor(s).astype(int)
    balls = np.rint((s - overs) * 10).astype(int)
    return overs * 6 + balls


def build_aggregated_stats(match_stats: pd.DataFrame) -> pd.DataFrame:
    df = match_stats.copy()
    df["balls_bowled"] = overs_to_balls_series(df["overs_bowled"])

    agg = (
        df.groupby(["player_id", "player_name"])
        .agg(
            matches_played=("match_id", "nunique"),
            innings_batted=("balls_faced", lambda x: (x > 0).sum()),
            innings_bowled=("balls_bowled", lambda x: (x > 0).sum()),
            total_runs=("runs_scored", "sum"),
            total_balls_batted=("balls_faced", "sum"),
            total_wickets=("wicket_taken", "sum"),
            total_balls_bowled=("balls_bowled", "sum"),
            total_runs_conceded=("runs_conceded", "sum"),
            outs=("Dismissal_Status", lambda x: (x != 0).sum()),
        )
        .reset_index()
    )

    agg["runs_per_match"] = agg["total_runs"] / agg["matches_played"]
    agg["wickets_per_match"] = agg["total_wickets"] / agg["matches_played"]
    agg["batting_average"] = agg["total_runs"] / agg["outs"].replace(0, np.nan)
    agg["batting_strike_rate"] = (
        100 * agg["total_runs"] / agg["total_balls_batted"].replace(0, np.nan)
    )
    agg["overs_bowled_total"] = agg["total_balls_bowled"] / 6.0
    agg["bowling_economy"] = (
        agg["total_runs_conceded"] / agg["overs_bowled_total"].replace(0, np.nan)
    )
    agg["overs_per_match"] = agg["overs_bowled_total"] / agg["matches_played"]

    return agg


def merge_master(
    players: pd.DataFrame,
    stats_agg: pd.DataFrame,
    auction: pd.DataFrame,
) -> pd.DataFrame:
    master = auction.merge(
        players,
        how="left",
        left_on="name",
        right_on="player_name",
        suffixes=("", "_players"),
    )

    master = master.merge(
        stats_agg,
        how="left",
        on=["player_id", "player_name"],
    )

    master["date_of_birth_parsed"] = pd.to_datetime(
        master["date_of_birth"], dayfirst=True, errors="coerce"
    )
    master["age_at_auction"] = (
        master["year"] - master["date_of_birth_parsed"].dt.year
    )

    master["country_bucket"] = np.where(
        master["country"].fillna("") == "India",
        "Indian",
        "Overseas",
    )

    master["is_wicket_keeper"] = master["is_wicket_keeper"].fillna(0).astype(int)

    return master


def load_and_prepare_master() -> pd.DataFrame:
    """
    Public entry for backend: load CSVs from data/ and build master table.
    """
    players_df = pd.read_csv(PLAYERS_PATH)
    match_stats_df = pd.read_csv(MATCH_STATS_PATH)
    auction_df = pd.read_csv(AUCTION_SUMMARY_PATH)

    stats_agg_df = build_aggregated_stats(match_stats_df)
    master_df = merge_master(players_df, stats_agg_df, auction_df)

    return master_df
