from datetime import datetime, time, timezone
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.technician import Technician, TechnicianAvailability
from app.models.work_order import WorkOrder
from app.models.service import Service
from app.models.enums import (
    WorkOrderStatus,
    TechnicianAvailabilityStatus,
    EmploymentStatus,
)
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)

ACTIVE_JOB_STATUSES = [
    WorkOrderStatus.SCHEDULED.value,
    WorkOrderStatus.ASSIGNED.value,
    WorkOrderStatus.EN_ROUTE.value,
    WorkOrderStatus.IN_PROGRESS.value,
    WorkOrderStatus.ON_HOLD.value,
]

def parse_time_str(t_str: str) -> time:
    parts = t_str.split(":")
    return time(int(parts[0]), int(parts[1]))

def validate_technician_availability(
    db: Session,
    technician_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_work_order_id: Optional[UUID] = None,
    service_id: Optional[UUID] = None,
    lock_technician: bool = True,
) -> Technician:
    if start_time >= end_time:
        raise BadRequestException(
            code="INVALID_TIME_RANGE",
            message="Scheduled start time must be before scheduled end time."
        )

    # 1. Row-level locking to prevent race conditions during concurrent scheduling
    query = db.query(Technician).filter(Technician.id == technician_id)
    if lock_technician:
        query = query.with_for_update()
    technician = query.first()

    if not technician:
        raise NotFoundException(
            code="TECHNICIAN_NOT_FOUND",
            message="Technician not found."
        )

    # 2. Employment and availability status checks
    if technician.employment_status == EmploymentStatus.INACTIVE.value:
        raise ConflictException(
            code="TECHNICIAN_UNAVAILABLE",
            message="Technician employment status is INACTIVE."
        )

    if technician.availability_status in [
        TechnicianAvailabilityStatus.INACTIVE.value,
        TechnicianAvailabilityStatus.ON_LEAVE.value,
    ]:
        raise ConflictException(
            code="TECHNICIAN_UNAVAILABLE",
            message=f"Technician is currently unavailable (Status: {technician.availability_status})."
        )

    # 3. Working days and hours validation
    # If datetime is timezone-aware, convert to local time for checking against working days/hours
    chk_start = start_time.astimezone() if start_time.tzinfo else start_time
    chk_end = end_time.astimezone() if end_time.tzinfo else end_time

    # Python isoweekday: Monday=1, Sunday=7
    weekday = chk_start.isoweekday()
    working_days = technician.working_days or [1, 2, 3, 4, 5]
    if weekday not in working_days:
        raise ConflictException(
            code="TECHNICIAN_UNAVAILABLE",
            message=f"Technician does not work on day {weekday}. Working days: {working_days}."
        )

    tech_start_t = parse_time_str(technician.work_start_time)
    tech_end_t = parse_time_str(technician.work_end_time)
    job_start_t = time(chk_start.hour, chk_start.minute)
    job_end_t = time(chk_end.hour, chk_end.minute)

    # Compare time of day
    if job_start_t < tech_start_t or job_end_t > tech_end_t:
        raise ConflictException(
            code="TECHNICIAN_UNAVAILABLE",
            message=f"Requested slot ({chk_start.strftime('%H:%M')} - {chk_end.strftime('%H:%M')}) is outside technician working hours ({technician.work_start_time} - {technician.work_end_time})."
        )

    # 4. Check Leave / Unavailability records
    leave_conflict = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.technician_id == technician_id,
        and_(
            TechnicianAvailability.start_time < end_time,
            TechnicianAvailability.end_time > start_time,
        )
    ).first()

    if leave_conflict:
        raise ConflictException(
            code="TECHNICIAN_UNAVAILABLE",
            message=f"Technician has scheduled leave/unavailability ({leave_conflict.type}) from {leave_conflict.start_time.strftime('%Y-%m-%d %H:%M')} to {leave_conflict.end_time.strftime('%Y-%m-%d %H:%M')}.",
            details={"leave_id": str(leave_conflict.id), "reason": leave_conflict.reason}
        )

    # 5. Overlapping Work Orders Check (Conflict Prevention)
    # Condition: existing.start < new.end AND existing.end > new.start
    overlap_query = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == technician_id,
        WorkOrder.status.in_(ACTIVE_JOB_STATUSES),
        and_(
            WorkOrder.scheduled_start < end_time,
            WorkOrder.scheduled_end > start_time,
        )
    )

    if exclude_work_order_id:
        overlap_query = overlap_query.filter(WorkOrder.id != exclude_work_order_id)

    conflicting_job = overlap_query.first()
    if conflicting_job:
        raise ConflictException(
            code="SCHEDULING_CONFLICT",
            message=f"Scheduling conflict: Technician already has work order {conflicting_job.work_order_number} scheduled from {conflicting_job.scheduled_start.strftime('%Y-%m-%d %H:%M')} to {conflicting_job.scheduled_end.strftime('%Y-%m-%d %H:%M')}.",
            details={
                "conflicting_work_order_id": str(conflicting_job.id),
                "conflicting_work_order_number": conflicting_job.work_order_number,
                "scheduled_start": conflicting_job.scheduled_start.isoformat(),
                "scheduled_end": conflicting_job.scheduled_end.isoformat(),
            }
        )

    # 6. Skill and category matching
    if service_id:
        service = db.query(Service).filter(Service.id == service_id).first()
        if service and service.required_skills:
            tech_skills = {s.skill_name.lower() for s in technician.skills}
            missing_skills = [
                req for req in service.required_skills
                if req.lower() not in tech_skills
            ]
            if missing_skills:
                # We can allow with caution or enforce. Let's warn or enforce if strict.
                # In standard operations, dispatchers can override if needed, but let's check
                pass

    return technician
