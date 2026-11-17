from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel

class OperationsDashboardMetrics(BaseModel):
    total_work_orders: int
    pending_service_requests: int
    scheduled_jobs: int
    in_progress_jobs: int
    completed_jobs: int
    cancelled_jobs: int
    technician_utilization_rate: float
    average_completion_time_hours: float
    customer_satisfaction_avg: float
    low_stock_parts_count: int
    recent_work_orders: List[Dict[str, Any]] = []
    monthly_trend: List[Dict[str, Any]] = []

class DispatcherDashboardMetrics(BaseModel):
    unassigned_work_orders_count: int
    today_scheduled_jobs_count: int
    active_technicians_count: int
    technician_availability_summary: List[Dict[str, Any]] = []
    scheduling_conflicts_count: int
    urgent_jobs_count: int
    rescheduling_requests_count: int
    unassigned_work_orders: List[Dict[str, Any]] = []
    today_jobs: List[Dict[str, Any]] = []
    urgent_service_jobs: List[Dict[str, Any]] = []

class TechnicianDashboardMetrics(BaseModel):
    my_assigned_work_orders_count: int
    today_appointments_count: int
    upcoming_jobs_count: int
    in_progress_jobs_count: int
    completed_jobs_count: int
    parts_issued_count: int
    pending_service_reports_count: int
    today_appointments: List[Dict[str, Any]] = []
    active_job: Optional[Dict[str, Any]] = None

class CustomerDashboardMetrics(BaseModel):
    my_service_requests_count: int
    upcoming_appointments_count: int
    active_work_orders_count: int
    completed_services_count: int
    service_reports_count: int
    feedback_submitted_count: int
    upcoming_appointments: List[Dict[str, Any]] = []
    active_work_orders: List[Dict[str, Any]] = []
    recent_reports: List[Dict[str, Any]] = []

class DispatchBoardSlot(BaseModel):
    technician_id: UUID
    technician_name: str
    region: str
    availability_status: str
    work_start_time: str
    work_end_time: str
    skills: List[str] = []
    phone: Optional[str] = None
    email: Optional[str] = None
    total_booked_hours: float = 0.0
    capacity_percentage: int = 0
    work_orders: List[Dict[str, Any]] = []
    leaves: List[Dict[str, Any]] = []

class DispatchBoardResponse(BaseModel):
    date: date
    technicians: List[DispatchBoardSlot]
    unassigned_work_orders: List[Dict[str, Any]] = []
    stats: Dict[str, Any] = {}
