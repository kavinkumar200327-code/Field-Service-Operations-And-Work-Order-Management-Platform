from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.enums import CustomerType, CustomerStatus

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: str = Field(..., min_length=5)
    address: str = Field(..., min_length=3)
    service_location: str = Field(..., min_length=3)
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    status: CustomerStatus = CustomerStatus.ACTIVE

class CustomerCreate(CustomerBase):
    user_id: Optional[UUID] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    service_location: Optional[str] = None
    customer_type: Optional[CustomerType] = None
    status: Optional[CustomerStatus] = None

class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

class CustomerDetailResponse(CustomerResponse):
    active_work_orders_count: int = 0
    total_service_requests_count: int = 0
    total_spent: float = 0.0

class CustomerHistoryItem(BaseModel):
    work_order_id: UUID
    work_order_number: str
    service_name: str
    status: str
    scheduled_start: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost: Optional[float] = None
    technician_name: Optional[str] = None
    rating: Optional[int] = None

class CustomerServiceHistoryResponse(BaseModel):
    customer: CustomerResponse
    history: List[CustomerHistoryItem]
