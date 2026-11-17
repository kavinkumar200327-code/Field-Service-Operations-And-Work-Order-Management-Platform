from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ReportAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    file_name: str
    file_path: str
    file_size: int
    content_type: str
    attachment_type: str
    created_at: datetime

class ServiceReportCreate(BaseModel):
    work_summary: str = Field(..., min_length=5)
    diagnosis: str = Field(..., min_length=3)
    actions_performed: str = Field(..., min_length=5)
    start_time: datetime
    completion_time: datetime
    customer_remarks: Optional[str] = None
    recommendations: Optional[str] = None
    parts_used: Optional[List[Any]] = []

class ServiceReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_order_id: UUID
    work_order_number: Optional[str] = None
    technician_id: UUID
    technician_name: Optional[str] = None
    work_summary: str
    diagnosis: str
    actions_performed: str
    parts_used: List[Any] = []
    start_time: datetime
    completion_time: datetime
    customer_remarks: Optional[str] = None
    recommendations: Optional[str] = None
    attachments: List[ReportAttachmentResponse] = []
    created_at: datetime
    updated_at: datetime
