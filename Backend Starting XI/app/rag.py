# backend_starting_xi/src/rag.py

from typing import Optional, Dict
from .schemas import TeamProfileResponse

# You can tune these names as per current season / your dataset
TEAM_RAG: Dict[str, Dict] = {
    "CSK": {
        "team_name": "Chennai Super Kings",
        "captain": "MS Dhoni",
        "vice_captain": "Ravindra Jadeja",
        "description": (
            "CSK is built around calm leadership and depth. "
            "Dhoni controls the chase and Jadeja offers balance with bat and ball."
        ),
    },
    "MI": {
        "team_name": "Mumbai Indians",
        "captain": "Rohit Sharma",
        "vice_captain": "Suryakumar Yadav",
        "description": (
            "MI is a power-hitting heavy side with strong top order and death bowling."
        ),
    },
    "RCB": {
        "team_name": "Royal Challengers Bengaluru",
        "captain": "Faf du Plessis",
        "vice_captain": "Virat Kohli",
        "description": (
            "RCB leans on top-order firepower and aggressive chasing mentality."
        ),
    },
    # Add all other teams here...
}


def get_team_profile(team_code: str) -> Optional[TeamProfileResponse]:
    data = TEAM_RAG.get(team_code.upper())
    if not data:
        return None

    return TeamProfileResponse(
        team_code=team_code.upper(),
        team_name=data["team_name"],
        captain=data["captain"],
        vice_captain=data["vice_captain"],
        description=data["description"],
    )


def get_captain_and_vice(team_code: str) -> tuple[Optional[str], Optional[str]]:
    """Helper for selection logic."""
    data = TEAM_RAG.get(team_code.upper())
    if not data:
        return None, None
    return data["captain"], data["vice_captain"]
