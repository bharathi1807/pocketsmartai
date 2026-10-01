"""Validation utilities for file uploads, budgets, and user inputs."""

import os
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings


def validate_budget(budget: float, min_budget: float = 100.0, max_budget: float = 50000000.0) -> float:
    """Validate that the budget is a positive realistic number."""
    if budget <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget must be greater than zero."
        )
    if budget < min_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Budget is too low to formulate realistic recommendations (minimum {min_budget:,.0f})."
        )
    if budget > max_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Budget exceeds maximum allowable limit ({max_budget:,.0f})."
        )
    return float(budget)


def validate_image_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate image extension, MIME type, and size."""
    if not file.filename:
        return False, "File must have a valid filename."

    # Extension check
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_extensions_set:
        allowed = ", ".join(settings.allowed_extensions_set)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed image formats: {allowed}."
        )

    # Content-type check
    valid_content_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type and file.content_type.lower() not in valid_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Must be an image (JPEG, PNG, WEBP)."
        )

    return True, ext
