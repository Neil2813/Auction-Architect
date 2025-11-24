# backend_auction/src/schemas.py

from pydantic import BaseModel
from typing import List, Optional


class TrainResponse(BaseModel):
    message: str


class PricePredictRequest(BaseModel):
    player_name: str


class PricePredictResponse(BaseModel):
    player_name: str
    predicted_price: float
    currency: str


class SquadPlayer(BaseModel):
    player_name: str
    role: str
    predicted_price: float
    is_overseas: bool


class SquadRequest(BaseModel):
    budget: float
    max_players: int = 25
    max_overseas: int = 8


class SquadResponse(BaseModel):
    total_spent: float
    remaining_budget: float
    players: List[SquadPlayer]
    overseas_count: int
    total_players: int
