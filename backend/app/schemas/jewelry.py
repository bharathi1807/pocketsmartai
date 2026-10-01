from typing import Optional
from pydantic import BaseModel, Field


class JewelryPlannerRequest(BaseModel):
    budget: float = Field(..., gt=0, description="Jewelry budget in currency units")
    occasion: str = Field(..., min_length=2, description="Occasion: Wedding, Festive, Daily Wear, Cocktail Party, Engagement")
    jewelry_type: str = Field(..., min_length=2, description="Jewelry category: Necklace Set, Choker, Earrings, Bangles, Rings")
    preferred_style: str = Field(..., min_length=2, description="Style: Traditional Temple, Kundan/Polki, Minimalist Modern, Diamond Contemporary")
    preferred_color: Optional[str] = Field(None, description="Accent stone or metal color: Emerald green, ruby red, sapphire blue, pearl white")
    material_preference: str = Field(..., min_length=2, description="Material: 925 Sterling Silver, 18K Rose Gold, Gold Plated, Kundan Brass")
    outfit_description: Optional[str] = Field(None, description="Description of the dress/saree/suit neckline, fabric, and color")
