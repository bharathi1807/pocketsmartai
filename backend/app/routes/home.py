"""Home Interior Planner Route."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_optional_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.home import HomePlannerRequest
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.utils.validators import validate_budget

router = APIRouter(prefix="/api/planners", tags=["Home Interior Planner"])


@router.post("/home", response_model=RecommendationResponse)
async def plan_home_interior(
    payload: HomePlannerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user)
):
    """Generate budget-optimized interior purchasing recommendations.

    Accepts budget, room dimensions/type, style preferences, and furnishing requirements.
    Persists query to history if user is logged in.
    """
    validate_budget(payload.total_budget, min_budget=500.0)

    try:
        response = await RecommendationService.process_home_plan(payload, db=db, user=user)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling your home interior recommendations: {str(e)}"
        )
