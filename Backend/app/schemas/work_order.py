from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import WorkOrderStatus, PriorityLevel

class WorkOrderCreate(BaseModel):
    customer_id: UUID
    service_id: UUID
    service_request_id: Optional[UUID] = None
    service_location: str = Field(..., min_length=5)
    description: str = Field(..., min_length=5)
    priority: PriorityLevel = PriorityLevel.MEDIUM
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    assigned_technician_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None

class WorkOrderUpdate(BaseModel):
    service_location: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityLevel] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    completion_notes: Optional[str] = None
    status: Optional[WorkOrderStatus] = None

class WorkOrderAssignRequest(BaseModel):
    technician_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime
    notes: Optional[str] = None

class WorkOrderRescheduleRequest(BaseModel):
    scheduled_start: datetime
    scheduled_end: datetime
    technician_id: Optional[UUID] = None # Can reassign simultaneously or keep current
    reason: str = Field(..., min_length=3)

class WorkOrderCancelRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=5)

class WorkOrderHoldRequest(BaseModel):
    hold_reason: str = Field(..., min_length=5)

class WorkOrderCompleteRequest(BaseModel):
    work_summary: str = Field(..., min_length=5)
    actions_performed: Optional[str] = None
    diagnosis: Optional[str] = None
    actual_cost: Optional[float] = Field(None, ge=0)
    customer_remarks: Optional[str] = None
    recommendations: Optional[str] = None

class StatusHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    previous_status: Optional[str] = None
    new_status: str
    changed_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class AssignmentHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    technician_id: UUID
    technician_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    reason: Optional[str] = None

class WorkOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_order_number: str
    customer_id: UUID
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    service_id: UUID
    service_name: Optional[str] = None
    service_category_name: Optional[str] = None
    service_request_id: Optional[UUID] = None
    assigned_technician_id: Optional[UUID] = None
    technician_name: Optional[str] = None
    technician_phone: Optional[str] = None
    service_location: str
    description: str
    priority: str
    status: str
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    estimated_cost: float
    actual_cost: Optional[float] = None
    cancellation_reason: Optional[str] = None
    hold_reason: Optional[str] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class WorkOrderDetailResponse(WorkOrderResponse):
    status_history: List[StatusHistoryItem] = []
    assignments: List[AssignmentHistoryItem] = []
    parts_consumed: List[Any] = []
    has_report: bool = False
    has_feedback: bool = False
