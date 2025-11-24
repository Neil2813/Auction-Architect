# src/config.py

import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

PLAYERS_PATH = os.path.join(DATA_DIR, "players.csv")
MATCH_STATS_PATH = os.path.join(DATA_DIR, "player_match_stats.csv")
AUCTION_SUMMARY_PATH = os.path.join(DATA_DIR, "auction_summary.csv")

# Efficiency unsold percentile
EFFICIENCY_UNSOLD_PERCENTILE = 0.25

# 🔒 HARD-LOCKED TRAIN & PREDICTION YEARS
TRAIN_YEARS = [2023, 2024]   # model learns from these years' sold players
PREDICTION_YEAR = 2025       # ALL predictions exposed by API are for 2025 only
