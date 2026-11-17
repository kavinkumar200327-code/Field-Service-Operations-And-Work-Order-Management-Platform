from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    timeliness_rating: Optional[int] = Field(None, ge=1, le=5)
    quality_rating: Optional[int] = Field(None, ge=1, le=5)
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_order_id: UUID
    work_order_number: Optional[str] = None
    customer_id: UUID
    customer_name: Optional[str] = None
    rating: int
    timeliness_rating: Optional[int] = None
    quality_rating: Optional[int] = None
    professionalism_rating: Optional[int] = None
    comments: Optional[str] = None
    created_at: datetime
