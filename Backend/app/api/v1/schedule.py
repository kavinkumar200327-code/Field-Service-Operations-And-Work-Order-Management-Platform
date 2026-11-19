from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta, time
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.database import get_db
from app.api.deps import get_current_user
from app.models.technician import Technician, TechnicianAvailability
from app.models.work_order import WorkOrder
from app.models.enums import WorkOrderStatus
from app.schemas.report import DispatchBoardResponse, DispatchBoardSlot
from app.schemas.base import APIResponse

router = APIRouter(prefix="", tags=["Scheduling & Dispatch"])

@router.get("/schedule", response_model=APIResponse[List[dict]])
def get_schedule(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    technician_id: Optional[UUID] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    include_leaves: bool = Query(True),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    # Defaults to past 30 days and next 60 days if dates are not specified
    if not isinstance(start_date, date):
        start_date = date.today() - timedelta(days=30)
    if not isinstance(end_date, date):
        end_date = date.today() + timedelta(days=60)

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)

    query = db.query(WorkOrder).filter(
        WorkOrder.scheduled_start != None,
        WorkOrder.scheduled_start >= start_dt,
        WorkOrder.scheduled_start <= end_dt,
        WorkOrder.status.notin_([WorkOrderStatus.CANCELLED.value]),
    )

    if technician_id:
        query = query.filter(WorkOrder.assigned_technician_id == technician_id)
    if status:
        query = query.filter(WorkOrder.status == status)
    if priority:
        query = query.filter(WorkOrder.priority == priority)

    work_orders = query.order_by(WorkOrder.scheduled_start).all()

    events = []
    for wo in work_orders:
        events.append({
            "id": str(wo.id),
            "type": "WORK_ORDER",
            "work_order_number": wo.work_order_number,
            "title": f"{wo.work_order_number} - {wo.service.name if wo.service else 'Service'}",
            "service_name": wo.service.name if wo.service else "Field Service",
            "start": wo.scheduled_start.isoformat(),
            "end": wo.scheduled_end.isoformat() if wo.scheduled_end else wo.scheduled_start.isoformat(),
            "technician_id": str(wo.assigned_technician_id) if wo.assigned_technician_id else None,
            "technician_name": wo.assigned_technician.user.full_name if wo.assigned_technician and wo.assigned_technician.user else "Unassigned",
            "technician_region": wo.assigned_technician.assigned_region if wo.assigned_technician else None,
            "customer_name": wo.customer.name if wo.customer else "Client",
            "customer_phone": wo.customer.phone if wo.customer else None,
            "status": wo.status,
            "priority": wo.priority,
            "location": wo.service_location,
            "description": wo.description,
            "estimated_cost": float(wo.estimated_cost) if wo.estimated_cost is not None else 0.0,
            "actual_cost": float(wo.actual_cost) if wo.actual_cost is not None else None,
        })

    # Include technician scheduled leaves if requested
    if include_leaves:
        leaves_query = db.query(TechnicianAvailability).filter(
            TechnicianAvailability.start_time <= end_dt,
            TechnicianAvailability.end_time >= start_dt,
        )
        if technician_id:
            leaves_query = leaves_query.filter(TechnicianAvailability.technician_id == technician_id)

        for l in leaves_query.all():
            events.append({
                "id": str(l.id),
                "type": "LEAVE",
                "work_order_number": "LEAVE",
                "title": f"Unavailable: {l.technician.user.full_name if l.technician and l.technician.user else 'Technician'} ({l.type})",
                "service_name": f"Technician Leave ({l.type})",
                "start": l.start_time.isoformat(),
                "end": l.end_time.isoformat(),
                "technician_id": str(l.technician_id),
                "technician_name": l.technician.user.full_name if l.technician and l.technician.user else "Technician",
                "technician_region": l.technician.assigned_region if l.technician else None,
                "customer_name": "Internal Operation",
                "customer_phone": None,
                "status": "ON_LEAVE",
                "priority": "LOW",
                "location": l.reason or "Scheduled leave / PTO",
                "description": l.reason or f"Technician scheduled {l.type}",
                "estimated_cost": 0.0,
            })

    return APIResponse(success=True, data=events)

@router.get("/schedule/availability", response_model=APIResponse[List[dict]])
def check_availability(
    technician_id: UUID,
    target_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> Any:
    if not target_date:
        target_date = date.today()

    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        return APIResponse(success=False, data=[], message="Technician not found.")

    day_start = datetime.combine(target_date, time.min)
    day_end = datetime.combine(target_date, time.max)

    # Fetch jobs on this date
    jobs = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == technician_id,
        WorkOrder.scheduled_start >= day_start,
        WorkOrder.scheduled_start <= day_end,
        WorkOrder.status.notin_([WorkOrderStatus.CANCELLED.value]),
    ).order_by(WorkOrder.scheduled_start).all()

    # Fetch leaves on this date
    leaves = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.technician_id == technician_id,
        TechnicianAvailability.start_time <= day_end,
        TechnicianAvailability.end_time >= day_start,
    ).all()

    slots = []
    for j in jobs:
        slots.append({
            "type": "JOB",
            "title": j.work_order_number,
            "start": j.scheduled_start.strftime("%H:%M"),
            "end": j.scheduled_end.strftime("%H:%M") if j.scheduled_end else "N/A",
            "status": j.status,
        })

    for l in leaves:
        slots.append({
            "type": "LEAVE",
            "title": f"Unavailable ({l.type})",
            "start": l.start_time.strftime("%H:%M"),
            "end": l.end_time.strftime("%H:%M"),
            "reason": l.reason,
        })

    return APIResponse(
        success=True,
        data={
            "technician_id": str(tech.id),
            "technician_name": tech.user.full_name if tech.user else "Technician",
            "working_hours": f"{tech.work_start_time} - {tech.work_end_time}",
            "is_working_day": target_date.isoweekday() in (tech.working_days or [1,2,3,4,5]),
            "scheduled_slots": slots,
        }
    )

@router.get("/dispatch/board", response_model=APIResponse[DispatchBoardResponse])
def get_dispatch_board(
    board_date: Optional[date] = Query(None, alias="date"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    if not isinstance(board_date, date):
        board_date = date.today()

    day_start = datetime.combine(board_date, time.min)
    day_end = datetime.combine(board_date, time.max)

    technicians = db.query(Technician).filter(Technician.employment_status != "INACTIVE").all()

    board_slots = []
    for t in technicians:
        jobs = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == t.id,
            WorkOrder.scheduled_start >= day_start,
            WorkOrder.scheduled_start <= day_end,
            WorkOrder.status.notin_([WorkOrderStatus.CANCELLED.value]),
        ).order_by(WorkOrder.scheduled_start).all()

        job_dicts = []
        for j in jobs:
            dur = int((j.scheduled_end - j.scheduled_start).total_seconds() / 60) if j.scheduled_end and j.scheduled_start else 60
            job_dicts.append({
                "id": str(j.id),
                "work_order_number": j.work_order_number,
                "customer_name": j.customer.name if j.customer else "Client",
                "customer_phone": j.customer.phone if j.customer else None,
                "service_name": j.service.name if j.service else "Service",
                "service_location": j.service_location,
                "start": j.scheduled_start.strftime("%H:%M") if j.scheduled_start else "09:00",
                "end": j.scheduled_end.strftime("%H:%M") if j.scheduled_end else "10:30",
                "start_iso": j.scheduled_start.isoformat() if j.scheduled_start else None,
                "end_iso": j.scheduled_end.isoformat() if j.scheduled_end else None,
                "status": j.status,
                "priority": j.priority,
                "estimated_cost": float(j.estimated_cost or 0.0),
                "duration_minutes": max(30, dur),
            })

        leaves = db.query(TechnicianAvailability).filter(
            TechnicianAvailability.technician_id == t.id,
            TechnicianAvailability.start_time <= day_end,
            TechnicianAvailability.end_time >= day_start,
        ).all()

        leave_dicts = []
        for l in leaves:
            leave_dicts.append({
                "id": str(l.id),
                "type": l.type,
                "start": l.start_time.strftime("%H:%M"),
                "end": l.end_time.strftime("%H:%M"),
                "reason": l.reason,
            })

        skills_list = [s.skill_name for s in t.skills]
        total_booked_hours = sum(j.get("duration_minutes", 60) for j in job_dicts) / 60.0
        capacity_pct = min(100, round((total_booked_hours / 8.0) * 100))

        # Dynamic availability status reflection for the dispatch board date:
        if t.employment_status == "ON_LEAVE" or len(leave_dicts) > 0:
            avail_status = "ON_LEAVE"
        elif len(job_dicts) > 0:
            avail_status = "BUSY"
        else:
            avail_status = "AVAILABLE"

        board_slots.append(DispatchBoardSlot(
            technician_id=t.id,
            technician_name=t.user.full_name if t.user else "Technician",
            region=t.assigned_region,
            availability_status=avail_status,
            work_start_time=t.work_start_time,
            work_end_time=t.work_end_time,
            skills=skills_list,
            phone=t.user.phone if t.user else None,
            email=t.user.email if t.user else None,
            total_booked_hours=round(total_booked_hours, 1),
            capacity_percentage=capacity_pct,
            work_orders=job_dicts,
            leaves=leave_dicts,
        ))

    # Fetch unassigned / pending work orders awaiting triage dispatch
    unassigned = db.query(WorkOrder).filter(
        or_(
            WorkOrder.assigned_technician_id == None,
            WorkOrder.status.in_([WorkOrderStatus.DRAFT.value]),
        ),
        WorkOrder.status.notin_([WorkOrderStatus.CANCELLED.value, WorkOrderStatus.COMPLETED.value]),
    ).order_by(desc(WorkOrder.created_at)).limit(10).all()

    unassigned_dicts = []
    for u in unassigned:
        unassigned_dicts.append({
            "id": str(u.id),
            "work_order_number": u.work_order_number,
            "customer_name": u.customer.name if u.customer else "Client",
            "customer_phone": u.customer.phone if u.customer else None,
            "service_name": u.service.name if u.service else "Service",
            "service_location": u.service_location,
            "priority": u.priority,
            "status": u.status,
            "estimated_duration": u.service.estimated_duration if u.service else 60,
            "estimated_cost": float(u.estimated_cost or 0.0),
            "description": u.description,
        })

    total_scheduled_jobs = sum(len(slot.work_orders) for slot in board_slots)
    total_hours_booked = sum(slot.total_booked_hours for slot in board_slots)
    max_fleet_hours = len(board_slots) * 8.0 if board_slots else 1.0
    fleet_utilization_pct = min(100, round((total_hours_booked / max_fleet_hours) * 100))
    total_rev = sum(sum(j.get("estimated_cost", 0.0) for j in slot.work_orders) for slot in board_slots)

    stats = {
        "total_technicians": len(board_slots),
        "available_technicians": sum(1 for s in board_slots if s.availability_status == "AVAILABLE"),
        "busy_technicians": sum(1 for s in board_slots if s.availability_status == "BUSY"),
        "total_scheduled_jobs": total_scheduled_jobs,
        "fleet_utilization_pct": fleet_utilization_pct,
        "unassigned_count": len(unassigned_dicts),
        "total_revenue_today": round(total_rev, 2),
    }

    return APIResponse(
        success=True,
        data=DispatchBoardResponse(
            date=board_date,
            technicians=board_slots,
            unassigned_work_orders=unassigned_dicts,
            stats=stats,
        )
    )
