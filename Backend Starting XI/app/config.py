"""
Global config: paths, constants, team codes, wicket-keepers.
"""

from pathlib import Path

# Root project directory (this file is in app/, so go up one level)
BASE_DIR = Path(__file__).resolve().parent.parent

# Data & models directories
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

# CSV paths
PLAYERS_STATS_CSV = DATA_DIR / "IPL_dataset_final.csv"          # base stats
CURRENT_SEASON_STATS_CSV = DATA_DIR / "IPL_current_season_stats.csv"  # override stats (optional)
BALL_BY_BALL_CSV = DATA_DIR / "ball_by_ball_ipl.csv"           # optional, future

# Current squad list for each team (used ONLY for XI selection, not training)
# Expected columns (any reasonable variant is fine, we auto-detect):
#   - Team column: one of ["TEAM", "Team", "team"]
#   - Player column: one of ["Player", "player", "PLAYER_NAME", "player_name"]
PLAYERS_XI_CSV = DATA_DIR / "players.csv"

# Model path
PLAYER_SCORE_MODEL_PATH = MODELS_DIR / "player_score_model.joblib"

# Known IPL team codes (must match TEAM column values in stats CSV)
TEAM_CODES = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PK", "RCB", "RR", "SRH"]

# Manual wicket-keepers list
WICKET_KEEPERS = {
    "MS Dhoni",
    "Rishabh Pant",
    "Wriddhiman Saha",
    "Matthew Wade",
    "K L Rahul",
    "Quinton De Kock",
    "Ishan Kishan",
    "Jonny Bairstow",
    "Jitesh Sharma",
    "Dinesh Karthik",
    "Jos Buttler",
    "Sanju Samson",
    "Nicholas Pooran",
    "Devon Conway",
}
