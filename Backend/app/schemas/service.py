from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ServiceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    is_active: bool = True

class ServiceCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

class RequiredPartItem(BaseModel):
    part_sku: str
    name: Optional[str] = None
    quantity: int = 1

class ServiceCreate(BaseModel):
    category_id: UUID
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    estimated_duration: int = Field(..., gt=0, description="Duration in minutes")
    base_price: float = Field(..., ge=0, description="Base price in standard currency")
    required_skills: List[str] = []
    required_parts: List[RequiredPartItem] = []
    status: str = "ACTIVE"

class ServiceUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = None
    description: Optional[str] = None
    estimated_duration: Optional[int] = Field(None, gt=0)
    base_price: Optional[float] = Field(None, ge=0)
    required_skills: Optional[List[str]] = None
    required_parts: Optional[List[RequiredPartItem]] = None
    status: Optional[str] = None

class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    category_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    estimated_duration: int
    base_price: float
    required_skills: List[str] = []
    required_parts: List[RequiredPartItem] = []
    status: str
    created_at: datetime
    updated_at: datetime
