from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import EmploymentStatus, TechnicianAvailabilityStatus, LeaveType

class SkillItem(BaseModel):
    skill_name: str
    proficiency_level: str = "INTERMEDIATE"

class TechnicianCreate(BaseModel):
    user_id: Optional[UUID] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    assigned_region: str = "Metro Area"
    employment_status: EmploymentStatus = EmploymentStatus.FULL_TIME
    work_start_time: str = "08:00"
    work_end_time: str = "17:00"
    working_days: List[int] = [1, 2, 3, 4, 5]
    service_categories: List[str] = []
    skills: List[SkillItem] = []

class TechnicianUpdate(BaseModel):
    assigned_region: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    availability_status: Optional[TechnicianAvailabilityStatus] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    working_days: Optional[List[int]] = None
    service_categories: Optional[List[str]] = None
    skills: Optional[List[SkillItem]] = None

class TechnicianAvailabilityCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    type: LeaveType = LeaveType.LEAVE
    reason: Optional[str] = None

class TechnicianAvailabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    technician_id: UUID
    start_time: datetime
    end_time: datetime
    type: str
    reason: Optional[str] = None
    created_at: datetime

class TechnicianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    assigned_region: str
    employment_status: str
    availability_status: str
    work_start_time: str
    work_end_time: str
    working_days: List[int]
    service_categories: List[str]
    skills: List[SkillItem] = []
    current_workload: int = 0
    created_at: datetime
    updated_at: datetime

class TechnicianDetailResponse(TechnicianResponse):
    availabilities: List[TechnicianAvailabilityResponse] = []
    completed_jobs_count: int = 0
    average_rating: float = 0.0
