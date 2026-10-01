"""Recommendation Orchestration Service.

Coordinates between Gemini AI service, algorithmic Fallback service,
and persistent database history storage.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.database.models import User, RecommendationHistory
from app.schemas.home import HomePlannerRequest
from app.schemas.party import PartyPlannerRequest
from app.schemas.jewelry import JewelryPlannerRequest
from app.schemas.recommendation import RecommendationResponse
from app.services.gemini_service import gemini_service
from app.services.fallback_service import FallbackService

logger = logging.getLogger(__name__)


class RecommendationService:
    @staticmethod
    def _save_history(
        db: Optional[Session],
        user: Optional[User],
        planner_type: str,
        request_data: dict,
        response_data: dict
    ) -> Optional[RecommendationHistory]:
        """Persist recommendation session into database if user is authenticated."""
        if not db or not user:
            return None
        try:
            record = RecommendationHistory(
                user_id=user.id,
                planner_type=planner_type,
                request_data=request_data,
                response_data=response_data
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            return record
        except Exception as e:
            logger.error(f"Failed to persist recommendation history: {e}")
            db.rollback()
            return None

    @classmethod
    async def process_home_plan(
        cls,
        req: HomePlannerRequest,
        db: Optional[Session] = None,
        user: Optional[User] = None
    ) -> RecommendationResponse:
        # 1. Try Gemini
        res = await gemini_service.generate_home_plan(req)
        # 2. Fallback if needed
        if not res:
            res = FallbackService.generate_home_fallback(req)

        # 3. Save to database
        cls._save_history(
            db=db,
            user=user,
            planner_type="home",
            request_data=req.model_dump(),
            response_data=res.model_dump()
        )
        return res

    @classmethod
    async def process_party_plan(
        cls,
        req: PartyPlannerRequest,
        db: Optional[Session] = None,
        user: Optional[User] = None
    ) -> RecommendationResponse:
        # 1. Try Gemini
        res = await gemini_service.generate_party_plan(req)
        # 2. Fallback if needed
        if not res:
            res = FallbackService.generate_party_fallback(req)

        # 3. Save to database
        cls._save_history(
            db=db,
            user=user,
            planner_type="party",
            request_data=req.model_dump(),
            response_data=res.model_dump()
        )
        return res

    @classmethod
    async def process_jewelry_plan(
        cls,
        req: JewelryPlannerRequest,
        image_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None,
        db: Optional[Session] = None,
        user: Optional[User] = None
    ) -> RecommendationResponse:
        # 1. Try Gemini
        res = await gemini_service.generate_jewelry_plan(req, image_bytes=image_bytes, mime_type=mime_type)
        # 2. Fallback if needed
        if not res:
            res = FallbackService.generate_jewelry_fallback(req)

        # 3. Save to database
        req_dict = req.model_dump()
        req_dict["has_image"] = bool(image_bytes)
        cls._save_history(
            db=db,
            user=user,
            planner_type="jewelry",
            request_data=req_dict,
            response_data=res.model_dump()
        )
        return res
