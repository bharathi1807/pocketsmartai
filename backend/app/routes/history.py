"""Recommendation History routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import User, RecommendationHistory
from app.schemas.recommendation import HistoryItemResponse, HistoryListResponse

router = APIRouter(prefix="/api/history", tags=["Recommendation History"])


@router.get("", response_model=HistoryListResponse)
async def list_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all recommendation sessions saved by the authenticated user."""
    records = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.user_id == current_user.id)
        .order_by(RecommendationHistory.created_at.desc())
        .all()
    )

    items = [HistoryItemResponse.model_validate(r) for r in records]
    return HistoryListResponse(total_count=len(items), items=items)


@router.get("/{history_id}", response_model=HistoryItemResponse)
async def get_history_detail(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific recommendation session owned by the authenticated user."""
    record = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.id == history_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History record #{history_id} not found."
        )

    # Enforce user boundary: users cannot inspect other users' recommendations
    if record.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this recommendation record."
        )

    return HistoryItemResponse.model_validate(record)


@router.delete("/{history_id}", status_code=status.HTTP_200_OK)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific recommendation session from the authenticated user's history."""
    record = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.id == history_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History record #{history_id} not found."
        )

    if record.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this record."
        )

    db.delete(record)
    db.commit()
    return {"message": f"History record #{history_id} deleted successfully."}
