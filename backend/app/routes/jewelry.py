"""Jewelry Style & Budget Recommendation Route."""

import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.dependencies import get_optional_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.jewelry import JewelryPlannerRequest
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.utils.validators import validate_budget, validate_image_file

router = APIRouter(prefix="/api/planners", tags=["Jewelry Recommendation Planner"])


@router.post("/jewelry", response_model=RecommendationResponse)
async def plan_jewelry(
    request: Request,
    budget: Optional[float] = Form(None),
    occasion: Optional[str] = Form(None),
    jewelry_type: Optional[str] = Form(None),
    preferred_style: Optional[str] = Form(None),
    preferred_color: Optional[str] = Form(None),
    material_preference: Optional[str] = Form(None),
    outfit_description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user)
):
    """Generate jewelry styling recommendations based on occasion, style, and budget.

    Accepts multipart/form-data with an optional outfit photo or application/json payload.
    """
    image_bytes: Optional[bytes] = None
    mime_type: Optional[str] = None

    # Handle application/json if request was submitted as raw JSON
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = JewelryPlannerRequest(**body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON request body: {str(e)}"
            )
    else:
        # Validate form fields
        if budget is None or occasion is None or jewelry_type is None or preferred_style is None or material_preference is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Missing required fields: budget, occasion, jewelry_type, preferred_style, material_preference are required."
            )
        payload = JewelryPlannerRequest(
            budget=budget,
            occasion=occasion,
            jewelry_type=jewelry_type,
            preferred_style=preferred_style,
            preferred_color=preferred_color,
            material_preference=material_preference,
            outfit_description=outfit_description,
        )

    validate_budget(payload.budget, min_budget=50.0)

    # Process image if uploaded
    if image and image.filename:
        validate_image_file(image)
        try:
            image_bytes = await image.read()
            # Enforce file size limit
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            if len(image_bytes) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Image size ({len(image_bytes) / 1024 / 1024:.1f}MB) exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit."
                )
            mime_type = image.content_type or "image/jpeg"

            # Save file securely to upload directory with random UUID
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            ext = image.filename.rsplit(".", 1)[-1].lower() if "." in image.filename else "jpg"
            secure_filename = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, secure_filename)
            with open(file_path, "wb") as f:
                f.write(image_bytes)

        except HTTPException:
            raise
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to process uploaded outfit photo: {str(err)}"
            )

    try:
        response = await RecommendationService.process_jewelry_plan(
            req=payload,
            image_bytes=image_bytes,
            mime_type=mime_type,
            db=db,
            user=user
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling jewelry recommendations: {str(e)}"
        )
