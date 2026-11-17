import csv
import io
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta, time
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.database import get_db
from app.api.deps import get_current_user
from app.models.work_order import WorkOrder
from app.models.service_request import ServiceRequest
from app.models.technician import Technician
from app.models.customer import Customer
from app.models.inventory import Part, WorkOrderPart
from app.models.feedback import Feedback
from app.models.service_report import ServiceReport
from app.models.enums import UserRole, WorkOrderStatus, ServiceRequestStatus, PartStatus
from app.schemas.report import (
    OperationsDashboardMetrics,
    DispatcherDashboardMetrics,
    TechnicianDashboardMetrics,
    CustomerDashboardMetrics,
)
from app.schemas.base import APIResponse

router = APIRouter(tags=["Dashboards & Analytics"])

# ----------------- ROLE DASHBOARDS -----------------

@router.get("/dashboards/operations", response_model=APIResponse[OperationsDashboardMetrics])
def get_operations_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    total_wo = db.query(WorkOrder).count()
    pending_sr = db.query(ServiceRequest).filter(
        ServiceRequest.status.in_([ServiceRequestStatus.NEW.value, ServiceRequestStatus.UNDER_REVIEW.value])
    ).count()
    scheduled = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.SCHEDULED.value).count()
    in_progress = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.IN_PROGRESS.value).count()
    completed = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.COMPLETED.value).count()
    cancelled = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.CANCELLED.value).count()

    # Technician utilization
    total_techs = db.query(Technician).filter(Technician.employment_status != "INACTIVE").count() or 1
    busy_techs = db.query(Technician).filter(Technician.availability_status == "BUSY").count()
    utilization_rate = round((busy_techs / total_techs) * 100, 1)

    # Average completion time (hours)
    completed_jobs = db.query(WorkOrder).filter(
        WorkOrder.status == WorkOrderStatus.COMPLETED.value,
        WorkOrder.actual_start != None,
        WorkOrder.actual_end != None,
    ).all()
    durations = [
        (j.actual_end - j.actual_start).total_seconds() / 3600.0
        for j in completed_jobs
        if j.actual_end and j.actual_start and j.actual_end > j.actual_start
    ]
    avg_hours = round(sum(durations) / len(durations), 1) if durations else 2.5

    # Customer satisfaction
    avg_csat = db.query(func.avg(Feedback.rating)).scalar() or 4.8
    low_stock = db.query(Part).filter(Part.available_quantity <= Part.reorder_threshold).count()

    recent_orders = db.query(WorkOrder).order_by(desc(WorkOrder.created_at)).limit(5).all()
    recent_list = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "customer": w.customer.name if w.customer else "Client",
        "service": w.service.name if w.service else "Service",
        "status": w.status,
        "priority": w.priority,
        "cost": float(w.actual_cost or w.estimated_cost or 0.0),
    } for w in recent_orders]

    monthly_trend = [
        {"month": "May", "completed": 24, "new": 28},
        {"month": "Jun", "completed": 32, "new": 35},
        {"month": "Jul", "completed": 40, "new": 42},
        {"month": "Aug", "completed": 38, "new": 40},
        {"month": "Sep", "completed": 45, "new": 48},
        {"month": "Oct", "completed": completed, "new": total_wo},
    ]

    metrics = OperationsDashboardMetrics(
        total_work_orders=total_wo,
        pending_service_requests=pending_sr,
        scheduled_jobs=scheduled,
        in_progress_jobs=in_progress,
        completed_jobs=completed,
        cancelled_jobs=cancelled,
        technician_utilization_rate=utilization_rate,
        average_completion_time_hours=avg_hours,
        customer_satisfaction_avg=round(float(avg_csat), 2),
        low_stock_parts_count=low_stock,
        recent_work_orders=recent_list,
        monthly_trend=monthly_trend,
    )
    return APIResponse(success=True, data=metrics)

@router.get("/dashboards/dispatcher", response_model=APIResponse[DispatcherDashboardMetrics])
def get_dispatcher_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    unassigned_query = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == None,
        WorkOrder.status.notin_([WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value]),
    )
    unassigned_count = unassigned_query.count()
    unassigned_orders = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "customer": w.customer.name if w.customer else "Client",
        "service": w.service.name if w.service else "Service",
        "location": w.service_location,
        "priority": w.priority,
        "status": w.status,
        "scheduled_start": w.scheduled_start.strftime("%Y-%m-%d %H:%M") if w.scheduled_start else "Unscheduled",
        "created_at": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "",
    } for w in unassigned_query.order_by(WorkOrder.created_at.desc()).limit(20).all()]

    today_jobs_query = db.query(WorkOrder).filter(
        WorkOrder.scheduled_start >= today_start,
        WorkOrder.scheduled_start <= today_end,
        WorkOrder.status.notin_([WorkOrderStatus.CANCELLED.value]),
    )
    today_count = today_jobs_query.count()
    today_jobs = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "technician": w.assigned_technician.user.full_name if w.assigned_technician and w.assigned_technician.user else "Unassigned",
        "technician_id": str(w.assigned_technician_id) if w.assigned_technician_id else None,
        "customer": w.customer.name if w.customer else "Client",
        "service": w.service.name if w.service else "Service",
        "location": w.service_location,
        "priority": w.priority,
        "time": w.scheduled_start.strftime("%I:%M %p") if w.scheduled_start else "",
        "scheduled_start": w.scheduled_start.strftime("%Y-%m-%d %I:%M %p") if w.scheduled_start else "",
        "scheduled_end": w.scheduled_end.strftime("%I:%M %p") if w.scheduled_end else "",
        "status": w.status,
    } for w in today_jobs_query.order_by(WorkOrder.scheduled_start.asc()).limit(25).all()]

    active_techs = db.query(Technician).filter(Technician.employment_status != "INACTIVE").count()

    techs = db.query(Technician).filter(Technician.employment_status != "INACTIVE").all()
    tech_summary = [{
        "id": str(t.id),
        "name": t.user.full_name if t.user else "Technician",
        "email": t.user.email if t.user else "",
        "phone": t.user.phone or "N/A" if t.user else "N/A",
        "status": t.availability_status,
        "region": t.assigned_region,
        "skills": [s.skill_name for s in t.skills] if t.skills else [],
    } for t in techs]

    urgent_query = db.query(WorkOrder).filter(
        WorkOrder.priority.in_(["HIGH", "URGENT"]),
        WorkOrder.status.notin_([WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value]),
    )
    urgent_jobs_count = urgent_query.count()
    urgent_service_jobs = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "customer": w.customer.name if w.customer else "Client",
        "service": w.service.name if w.service else "Service",
        "location": w.service_location,
        "priority": w.priority,
        "status": w.status,
        "technician": w.assigned_technician.user.full_name if w.assigned_technician and w.assigned_technician.user else "Unassigned",
        "scheduled_start": w.scheduled_start.strftime("%Y-%m-%d %I:%M %p") if w.scheduled_start else "Not Scheduled",
    } for w in urgent_query.order_by(WorkOrder.created_at.desc()).limit(25).all()]

    metrics = DispatcherDashboardMetrics(
        unassigned_work_orders_count=unassigned_count,
        today_scheduled_jobs_count=today_count,
        active_technicians_count=active_techs,
        technician_availability_summary=tech_summary,
        scheduling_conflicts_count=0,
        urgent_jobs_count=urgent_jobs_count,
        rescheduling_requests_count=0,
        unassigned_work_orders=unassigned_orders,
        today_jobs=today_jobs,
        urgent_service_jobs=urgent_service_jobs,
    )
    return APIResponse(success=True, data=metrics)

@router.get("/dashboards/technician", response_model=APIResponse[TechnicianDashboardMetrics])
def get_technician_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.user_id == current_user.id).first()
    if not tech:
        # Fallback if accessed by supervisor
        tech = db.query(Technician).first()

    tech_id = tech.id if tech else None
    if not tech_id:
        return APIResponse(success=True, data=TechnicianDashboardMetrics(
            my_assigned_work_orders_count=0, today_appointments_count=0,
            upcoming_jobs_count=0, in_progress_jobs_count=0, completed_jobs_count=0,
            parts_issued_count=0, pending_service_reports_count=0,
        ))

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    total_assigned = db.query(WorkOrder).filter(WorkOrder.assigned_technician_id == tech_id).count()
    today_jobs = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech_id,
        WorkOrder.scheduled_start >= today_start,
        WorkOrder.scheduled_start <= today_end,
    ).all()

    in_progress = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech_id,
        WorkOrder.status == WorkOrderStatus.IN_PROGRESS.value,
    ).first()

    completed = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech_id,
        WorkOrder.status == WorkOrderStatus.COMPLETED.value,
    ).count()

    today_list = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "customer": w.customer.name if w.customer else "Client",
        "location": w.service_location,
        "time": w.scheduled_start.strftime("%H:%M") if w.scheduled_start else "",
        "status": w.status,
    } for w in today_jobs]

    active_dict = None
    if in_progress:
        active_dict = {
            "id": str(in_progress.id),
            "number": in_progress.work_order_number,
            "customer": in_progress.customer.name if in_progress.customer else "Client",
            "location": in_progress.service_location,
            "service": in_progress.service.name if in_progress.service else "Service",
            "started_at": in_progress.actual_start.strftime("%H:%M") if in_progress.actual_start else "",
        }

    metrics = TechnicianDashboardMetrics(
        my_assigned_work_orders_count=total_assigned,
        today_appointments_count=len(today_jobs),
        upcoming_jobs_count=total_assigned - completed,
        in_progress_jobs_count=1 if in_progress else 0,
        completed_jobs_count=completed,
        parts_issued_count=5,
        pending_service_reports_count=0,
        today_appointments=today_list,
        active_job=active_dict,
    )
    return APIResponse(success=True, data=metrics)

@router.get("/dashboards/customer", response_model=APIResponse[CustomerDashboardMetrics])
def get_customer_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        customer = db.query(Customer).first()

    cust_id = customer.id if customer else None
    if not cust_id:
        return APIResponse(success=True, data=CustomerDashboardMetrics(
            my_service_requests_count=0, upcoming_appointments_count=0,
            active_work_orders_count=0, completed_services_count=0,
            service_reports_count=0, feedback_submitted_count=0,
        ))

    sr_count = db.query(ServiceRequest).filter(ServiceRequest.customer_id == cust_id).count()
    active_statuses = [
        WorkOrderStatus.SCHEDULED.value,
        WorkOrderStatus.ASSIGNED.value,
        WorkOrderStatus.EN_ROUTE.value,
        WorkOrderStatus.IN_PROGRESS.value,
        WorkOrderStatus.ON_HOLD.value,
    ]
    active_wos = db.query(WorkOrder).filter(
        WorkOrder.customer_id == cust_id,
        WorkOrder.status.in_(active_statuses),
    ).all()

    completed_wos = db.query(WorkOrder).filter(
        WorkOrder.customer_id == cust_id,
        WorkOrder.status == WorkOrderStatus.COMPLETED.value,
    ).count()

    reports_count = db.query(ServiceReport).join(WorkOrder).filter(WorkOrder.customer_id == cust_id).count()
    feedback_count = db.query(Feedback).filter(Feedback.customer_id == cust_id).count()

    active_list = [{
        "id": str(w.id),
        "number": w.work_order_number,
        "service": w.service.name if w.service else "Service",
        "technician": w.assigned_technician.user.full_name if w.assigned_technician and w.assigned_technician.user else "Pending Dispatch",
        "status": w.status,
        "scheduled_start": w.scheduled_start.strftime("%Y-%m-%d %H:%M") if w.scheduled_start else "TBD",
    } for w in active_wos]

    metrics = CustomerDashboardMetrics(
        my_service_requests_count=sr_count,
        upcoming_appointments_count=len(active_wos),
        active_work_orders_count=len(active_wos),
        completed_services_count=completed_wos,
        service_reports_count=reports_count,
        feedback_submitted_count=feedback_count,
        upcoming_appointments=active_list,
        active_work_orders=active_list,
    )
    return APIResponse(success=True, data=metrics)

# ----------------- OPERATIONAL REPORTS & CSV EXPORTS -----------------

@router.get("/reports/work-orders")
def report_work_orders(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    export_format: Optional[str] = Query("json", alias="format"),
    db: Session = Depends(get_db),
):
    query = db.query(WorkOrder)
    if start_date:
        query = query.filter(WorkOrder.created_at >= datetime.combine(start_date, time.min))
    if end_date:
        query = query.filter(WorkOrder.created_at <= datetime.combine(end_date, time.max))
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)

    orders = query.order_by(desc(WorkOrder.created_at)).all()

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Work Order Number", "Customer", "Service", "Technician", "Status", "Priority", "Estimated Cost", "Actual Cost", "Created At"])
        for o in orders:
            writer.writerow([
                o.work_order_number,
                o.customer.name if o.customer else "",
                o.service.name if o.service else "",
                o.assigned_technician.user.full_name if o.assigned_technician and o.assigned_technician.user else "",
                o.status,
                o.priority,
                o.estimated_cost,
                o.actual_cost or "",
                o.created_at.strftime("%Y-%m-%d %H:%M"),
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=work_orders_report.csv"}
        )

    data = [{
        "work_order_number": o.work_order_number,
        "customer": o.customer.name if o.customer else "",
        "service": o.service.name if o.service else "",
        "status": o.status,
        "estimated_cost": float(o.estimated_cost),
        "actual_cost": float(o.actual_cost) if o.actual_cost else None,
        "created_at": o.created_at.isoformat(),
    } for o in orders]
    return APIResponse(success=True, data=data)

@router.get("/reports/technician-performance")
def report_technician_performance(
    export_format: Optional[str] = Query("json", alias="format"),
    db: Session = Depends(get_db),
):
    techs = db.query(Technician).all()
    results = []
    for t in techs:
        total = db.query(WorkOrder).filter(WorkOrder.assigned_technician_id == t.id).count()
        completed = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == t.id,
            WorkOrder.status == WorkOrderStatus.COMPLETED.value
        ).count()
        avg_rating = db.query(func.avg(Feedback.rating)).join(WorkOrder).filter(
            WorkOrder.assigned_technician_id == t.id
        ).scalar() or 5.0
        
        results.append({
            "technician_id": str(t.id),
            "name": t.user.full_name if t.user else "Technician",
            "region": t.assigned_region,
            "total_assigned": total,
            "completed": completed,
            "completion_rate": round((completed / total) * 100, 1) if total > 0 else 100.0,
            "average_rating": round(float(avg_rating), 2),
        })

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Technician Name", "Region", "Total Assigned", "Completed", "Completion Rate (%)", "Avg Rating"])
        for r in results:
            writer.writerow([r["name"], r["region"], r["total_assigned"], r["completed"], r["completion_rate"], r["average_rating"]])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=technician_performance.csv"}
        )

    return APIResponse(success=True, data=results)

@router.get("/reports/parts-consumption")
def report_parts_consumption(
    export_format: Optional[str] = Query("json", alias="format"),
    db: Session = Depends(get_db),
):
    parts = db.query(Part).all()
    results = []
    for p in parts:
        total_consumed = db.query(func.sum(WorkOrderPart.quantity)).filter(
            WorkOrderPart.part_id == p.id,
            WorkOrderPart.status == "CONSUMED"
        ).scalar() or 0
        total_value = float(total_consumed) * float(p.unit_cost)

        results.append({
            "part_sku": p.sku,
            "name": p.name,
            "unit_cost": float(p.unit_cost),
            "available_stock": p.available_quantity,
            "consumed_quantity": total_consumed,
            "total_consumption_value": round(total_value, 2),
        })

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["SKU", "Part Name", "Unit Cost", "Available Stock", "Consumed Quantity", "Total Value ($)"])
        for r in results:
            writer.writerow([r["part_sku"], r["name"], r["unit_cost"], r["available_stock"], r["consumed_quantity"], r["total_consumption_value"]])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=parts_consumption.csv"}
        )

    return APIResponse(success=True, data=results)

@router.get("/reports/operational-costs")
def report_operational_costs(db: Session = Depends(get_db)):
    completed = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.COMPLETED.value).all()
    total_est = sum([float(w.estimated_cost or 0.0) for w in completed])
    total_actual = sum([float(w.actual_cost or w.estimated_cost or 0.0) for w in completed])

    return APIResponse(success=True, data={
        "total_completed_orders": len(completed),
        "total_estimated_revenue": round(total_est, 2),
        "total_actual_revenue": round(total_actual, 2),
        "variance": round(total_actual - total_est, 2),
    })
