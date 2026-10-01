from typing import Optional
from pydantic import BaseModel, Field


class HomePlannerRequest(BaseModel):
    total_budget: float = Field(..., gt=0, description="Total budget in currency units (e.g. 50000)")
    room_type: str = Field(..., min_length=2, description="Type of room: Living Room, Master Bedroom, 1BHK, Studio, etc.")
    room_quantity: int = Field(1, ge=1, le=20, description="Number of rooms to furnish")
    style_preference: str = Field(
        ...,
        min_length=2,
        description="Preferred decor style: Modern Minimalist, Scandinavian, Contemporary, Bohemian, Industrial, Traditional"
    )
    furniture_requirements: Optional[str] = Field(None, description="Sofas, bed, wardrobe, TV unit, coffee table, etc.")
    lighting_requirements: Optional[str] = Field(None, description="Warm ambient, pendant lights, spotlights, strip LED")
    ceiling_fan_requirements: Optional[str] = Field(None, description="BLDC fans, designer wooden blades, smart fans")
    dining_table_requirements: Optional[str] = Field(None, description="4-seater solid wood, 6-seater glass, extendable")
    other_requirements: Optional[str] = Field(None, description="Rugs, curtains, planters, wall art, smart plugs")
