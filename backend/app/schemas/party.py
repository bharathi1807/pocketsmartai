from typing import Optional
from pydantic import BaseModel, Field


class PartyPlannerRequest(BaseModel):
    total_budget: float = Field(..., gt=0, description="Total celebration budget")
    guest_count: int = Field(..., ge=1, le=1000, description="Number of expected guests")
    event_type: str = Field(
        ...,
        min_length=2,
        description="Event type: Birthday Party, Wedding Sangeet, Corporate Mixer, Housewarming, Anniversary"
    )
    venue_requirements: Optional[str] = Field(None, description="Rooftop, banquet hall, private villa, backyard, restaurant lounge")
    food_requirements: Optional[str] = Field(None, description="Buffet catering, finger foods, mocktails/cocktails, 3-course dinner")
    decoration_requirements: Optional[str] = Field(None, description="Balloon arches, floral centerpieces, neon signage, photobooth")
    entertainment_requirements: Optional[str] = Field(None, description="Live DJ, acoustic singer, karaoke, magician, host/MC")
    accommodation_requirements: Optional[str] = Field(None, description="Rooms for outstation guests, hotel block booking")
