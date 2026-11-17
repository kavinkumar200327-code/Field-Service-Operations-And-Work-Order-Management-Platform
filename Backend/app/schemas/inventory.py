from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import PartStatus

class PartCreate(BaseModel):
    sku: str = Field(..., min_length=2)
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    available_quantity: int = Field(..., ge=0)
    unit_cost: float = Field(..., ge=0)
    reorder_threshold: int = Field(5, ge=0)

class PartUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    available_quantity: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    status: Optional[PartStatus] = None

class PartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    description: Optional[str] = None
    available_quantity: int
    reserved_quantity: int
    unit_cost: float
    reorder_threshold: int
    status: str
    created_at: datetime
    updated_at: datetime

class WorkOrderPartCreate(BaseModel):
    part_id: UUID
    quantity: int = Field(..., gt=0)
    action: str = Field("CONSUMED", description="CONSUMED or RESERVED")

class WorkOrderPartReturn(BaseModel):
    quantity: int = Field(..., gt=0)
    reason: Optional[str] = None

class WorkOrderPartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_order_id: UUID
    part_id: UUID
    part_sku: Optional[str] = None
    part_name: Optional[str] = None
    quantity: int
    unit_price: float
    status: str
    created_at: datetime
    updated_at: datetime
