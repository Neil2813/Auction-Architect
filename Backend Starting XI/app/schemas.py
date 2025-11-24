"""
schemas.py

Pydantic models for FastAPI requests/responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class PredictXIRequest(BaseModel):
    team_code: str = Field(..., example="RCB")
    venue: str = Field(..., example="chepauk")
    toss_decision: str = Field(..., example="bowl")


class PlayerOut(BaseModel):
    name: str
    country: str
    role: str
    final_score: float


class PredictXIResponse(BaseModel):
    team_code: str
    venue: str
    pitch_type: str
    pitch_notes: str
    starting_xi: List[PlayerOut]
    impact_player: Optional[PlayerOut] = None


class TrainResponse(BaseModel):
    message: str
    used_players: int
