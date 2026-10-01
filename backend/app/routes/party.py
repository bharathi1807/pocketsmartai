"""Party & Event Budget Planner Route."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_optional_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.party import PartyPlannerRequest
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.utils.validators import validate_budget

router = APIRouter(prefix="/api/planners", tags=["Party & Event Planner"])


@router.post("/party", response_model=RecommendationResponse)
async def plan_party_budget(
    payload: PartyPlannerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user)
):
    """Generate categorized budget recommendations for parties and events.

    Divides budget across Catering, Venue, Decor, and Entertainment based on guest count.
    Saves to recommendation history when user is authenticated.
    """
    validate_budget(payload.total_budget, min_budget=100.0)

    if payload.guest_count < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest count must be at least 1 person."
        )

    try:
        response = await RecommendationService.process_party_plan(payload, db=db, user=user)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling party recommendations: {str(e)}"
        )
