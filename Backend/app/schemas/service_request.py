from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import ServiceRequestStatus, PriorityLevel

class ServiceRequestCreate(BaseModel):
    service_id: UUID
    customer_id: Optional[UUID] = None # Optional: staff can specify customer; customers auto-use own customer_id
    service_location: str = Field(..., min_length=5)
    issue_description: str = Field(..., min_length=10)
    preferred_schedule: Optional[datetime] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    attachments: List[str] = []

class ServiceRequestUpdate(BaseModel):
    service_location: Optional[str] = None
    issue_description: Optional[str] = None
    preferred_schedule: Optional[datetime] = None
    priority: Optional[PriorityLevel] = None
    status: Optional[ServiceRequestStatus] = None
    review_notes: Optional[str] = None
    attachments: Optional[List[str]] = None

class ServiceRequestCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=5)

class ServiceRequestConvertToWorkOrder(BaseModel):
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    assigned_technician_id: Optional[UUID] = None
    priority: Optional[PriorityLevel] = None
    notes: Optional[str] = None

class ServiceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_number: str
    customer_id: UUID
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    service_id: UUID
    service_name: Optional[str] = None
    service_category_name: Optional[str] = None
    service_location: str
    preferred_schedule: Optional[datetime] = None
    priority: str
    status: str
    issue_description: str
    attachments: List[str] = []
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
