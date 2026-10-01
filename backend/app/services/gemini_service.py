"""Gemini Generative AI Integration Service.

Connects to Google Gemini API using gemini-3.8-flash model.
Handles text planning prompts and multimodal outfit image analysis.
Returns normalized structured JSON responses.
"""

import json
import logging
import os
import re
from typing import Optional, Dict, Any
from app.core.config import settings
from app.schemas.home import HomePlannerRequest
from app.schemas.party import PartyPlannerRequest
from app.schemas.jewelry import JewelryPlannerRequest
from app.schemas.recommendation import RecommendationResponse, RecommendationItem, BudgetSummary

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.model = settings.GEMINI_MODEL or "gemini-3.8-flash"
        self._client = None
        self._init_client()

    def _init_client(self):
        """Initialize the Google GenAI SDK client if API key is present."""
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini client initialized with model '{self.model}'")
            except ImportError:
                logger.warning("google-genai Python library not installed. Will use fallback service or REST.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client)

    def _clean_json_text(self, text: str) -> str:
        """Strip markdown code fence blocks if returned by the model."""
        text = text.strip()
        # Remove ```json ... ``` or ``` ... ```
        pattern = r"^```(?:json)?\s*([\s\S]*?)\s*```$"
        match = re.match(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return text

    def _parse_and_validate_response(
        self,
        raw_text: str,
        planner_type: str,
        budget: float
    ) -> Optional[RecommendationResponse]:
        """Parse raw model text into structured RecommendationResponse."""
        try:
            clean_text = self._clean_json_text(raw_text)
            data = json.loads(clean_text)

            # Extract or calculate budget summary
            items_raw = data.get("recommendations", [])
            items: list[RecommendationItem] = []
            total_allocated = 0.0

            for it in items_raw:
                price = float(it.get("estimated_price", 0.0))
                total_allocated += price
                items.append(
                    RecommendationItem(
                        category=str(it.get("category", "General")),
                        name=str(it.get("name", "Recommended Item")),
                        description=str(it.get("description", "")),
                        estimated_price=price,
                        platform=str(it.get("platform", "Amazon / Market")),
                        reason=str(it.get("reason", "Budget-aligned recommendation.")),
                        external_search_query=it.get("external_search_query") or f"{it.get('name', '')}"
                    )
                )

            remaining = round(max(0.0, budget - total_allocated), 2)
            pct = round((total_allocated / budget) * 100, 1) if budget > 0 else 100.0

            tips = [str(t) for t in data.get("tips", [])]
            if not tips:
                tips = ["Review item dimensions and platform ratings before purchasing."]

            return RecommendationResponse(
                planner_type=planner_type,
                budget=budget,
                budget_summary=BudgetSummary(
                    total_budget=budget,
                    allocated=round(total_allocated, 2),
                    remaining=remaining,
                    allocation_percentage=min(pct, 100.0)
                ),
                recommendations=items,
                tips=tips,
                is_fallback=False,
                disclaimer="AI-generated recommendation powered by Google Gemini. Platform names are suggested search targets; verify real-time inventory and pricing."
            )
        except Exception as err:
            logger.error(f"Error parsing Gemini response JSON: {err}. Raw text: {raw_text[:200]}")
            return None

    async def generate_home_plan(self, req: HomePlannerRequest) -> Optional[RecommendationResponse]:
        """Generate structured home interior recommendation via Gemini."""
        if not self.is_configured:
            return None

        prompt = f"""
You are an expert interior designer and budget estimator.
The user wants to plan interior purchases for their home with the following specifications:
- Total Budget: ${req.total_budget:,.2f}
- Room Type: {req.room_type}
- Room Quantity: {req.room_quantity}
- Style Preference: {req.style_preference}
- Furniture Requirements: {req.furniture_requirements or 'Essential ergonomic and stylish furniture'}
- Lighting Requirements: {req.lighting_requirements or 'Layered warm ambient and task lighting'}
- Ceiling Fan Requirements: {req.ceiling_fan_requirements or 'Energy efficient BLDC / modern design'}
- Dining Table Requirements: {req.dining_table_requirements or 'Appropriate for room dimensions'}
- Other Requirements: {req.other_requirements or 'Rugs, wall decor, curtains, accent pieces'}

Distribute the budget intelligently across the room essentials (Furniture, Lighting, Fixtures, Decor).
External platforms can include Amazon, IKEA, Pepperfry, Urban Ladder, Philips, etc.
Do not invent fake live inventory codes; provide realistic estimates and search suggestions.

Return ONLY a valid JSON object matching this schema:
{{
  "planner_type": "home",
  "budget": {req.total_budget},
  "recommendations": [
    {{
      "category": "Furniture",
      "name": "Specific item name",
      "description": "Specific details and materials",
      "estimated_price": 25000,
      "platform": "IKEA",
      "reason": "Why this matches the user's style and room constraints",
      "external_search_query": "search query for user"
    }}
  ],
  "tips": [
    "Practical actionable budget tip 1",
    "Practical actionable styling tip 2"
  ]
}}
"""
        try:
            from google.genai import types
            response = self._client.models.generateContent(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            if response and response.text:
                return self._parse_and_validate_response(response.text, "home", req.total_budget)
        except Exception as e:
            logger.error(f"Gemini API call failed for Home Planner: {e}")
        return None

    async def generate_party_plan(self, req: PartyPlannerRequest) -> Optional[RecommendationResponse]:
        """Generate structured party & event recommendation via Gemini."""
        if not self.is_configured:
            return None

        prompt = f"""
You are a premier event planner and budget coordinator.
The user wants to organize an event with the following parameters:
- Total Budget: ${req.total_budget:,.2f}
- Guest Count: {req.guest_count} guests (Per person budget: ~${(req.total_budget / max(req.guest_count, 1)):,.2f})
- Event Type: {req.event_type}
- Venue Requirements: {req.venue_requirements or 'Appropriate venue capacity'}
- Food & Catering: {req.food_requirements or 'Appetizers, main courses, beverages, desserts'}
- Decoration: {req.decoration_requirements or 'Thematic backdrops, balloons/florals, lighting'}
- Entertainment: {req.entertainment_requirements or 'Sound system, curated music/DJ, activities'}
- Accommodation: {req.accommodation_requirements or 'None or nearby guest rooms if needed'}

Divide the budget logically across Catering & Food, Venue, Decor & Atmosphere, and Entertainment.
External platforms/services can include Swiggy Gourmet, Zomato Catering, OYO, Local Banquet, Amazon Event Supplies.
Ensure the sum of item estimated prices stays within or equal to ${req.total_budget:,.2f}.

Return ONLY a valid JSON object matching this schema:
{{
  "planner_type": "party",
  "budget": {req.total_budget},
  "recommendations": [
    {{
      "category": "Catering",
      "name": "Buffet & Mocktail Package",
      "description": "Appetizers, 2 mains, dessert for {req.guest_count} pax",
      "estimated_price": 20000,
      "platform": "Local Caterer / Swiggy Gourmet",
      "reason": "Fits the per-head catering ratio comfortably",
      "external_search_query": "catering for {req.guest_count} people"
    }}
  ],
  "tips": [
    "Tip on catering contracts or dietary confirmations",
    "Tip on timeline coordination"
  ]
}}
"""
        try:
            from google.genai import types
            response = self._client.models.generateContent(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            if response and response.text:
                return self._parse_and_validate_response(response.text, "party", req.total_budget)
        except Exception as e:
            logger.error(f"Gemini API call failed for Party Planner: {e}")
        return None

    async def generate_jewelry_plan(
        self,
        req: JewelryPlannerRequest,
        image_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None
    ) -> Optional[RecommendationResponse]:
        """Generate structured jewelry recommendations via Gemini with optional multimodal outfit photo."""
        if not self.is_configured:
            return None

        prompt = f"""
You are a luxury jewelry stylist and gemologist.
The user wants jewelry recommendations matching these requirements:
- Budget: ${req.budget:,.2f}
- Occasion: {req.occasion}
- Jewelry Type: {req.jewelry_type}
- Preferred Style: {req.preferred_style}
- Accent Color: {req.preferred_color or 'Harmonizing tone'}
- Material Preference: {req.material_preference}
- Outfit Description: {req.outfit_description or 'Classic outfit'}
{"The user has attached an image of their outfit. Analyze the outfit's neckline, color palette, fabric texture, and embroidery to suggest jewelry that elevates the look." if image_bytes else ""}

Divide the budget across a Primary Statement Jewel, Coordinating Accents, and Care/Storage.
Platforms can include Tanishq, CaratLane, GIVA, BlueStone, Amazon Fashion, Mia.

Return ONLY a valid JSON object matching this schema:
{{
  "planner_type": "jewelry",
  "budget": {req.budget},
  "recommendations": [
    {{
      "category": "Primary Jewel",
      "name": "Jewelry piece title",
      "description": "Materials, craftsmanship, neckline pairing details",
      "estimated_price": 12000,
      "platform": "Tanishq / CaratLane",
      "reason": "Harmonizes with the outfit neckline and preferred style",
      "external_search_query": "search query"
    }}
  ],
  "tips": [
    "Maintenance or styling advice",
    "Color harmonization tip"
  ]
}}
"""
        try:
            from google.genai import types

            contents_payload = []
            if image_bytes and mime_type:
                contents_payload.append(
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type
                    )
                )
            contents_payload.append(prompt)

            response = self._client.models.generateContent(
                model=self.model,
                contents=contents_payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            if response and response.text:
                return self._parse_and_validate_response(response.text, "jewelry", req.budget)
        except Exception as e:
            logger.error(f"Gemini API call failed for Jewelry Planner: {e}")
        return None


gemini_service = GeminiService()
