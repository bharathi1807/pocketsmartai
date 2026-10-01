"""General recommendations router."""

from fastapi import APIRouter
from app.schemas.recommendation import RecommendationResponse

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations Overview"])


@router.get("/info")
async def get_recommendation_info():
    """Returns overview of available planner modules and platform integrations."""
    return {
        "planners": [
            {
                "id": "home",
                "name": "Home Interior Planner",
                "endpoint": "/api/planners/home",
                "categories": ["Furniture", "Lighting", "Fixtures", "Decor"],
                "platforms": ["Amazon", "IKEA", "Pepperfry", "Philips"]
            },
            {
                "id": "party",
                "name": "Party & Event Planner",
                "endpoint": "/api/planners/party",
                "categories": ["Catering", "Venue", "Decor", "Entertainment"],
                "platforms": ["Swiggy", "Zomato", "OYO", "Local Vendors"]
            },
            {
                "id": "jewelry",
                "name": "Jewelry Styling Planner",
                "endpoint": "/api/planners/jewelry",
                "categories": ["Primary Jewel", "Accent Set", "Care & Storage"],
                "platforms": ["Tanishq", "CaratLane", "GIVA", "BlueStone"],
                "multimodal": True
            }
        ]
    }
