import secrets
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.core.scheduling import validate_technician_availability
from app.models.work_order import WorkOrder, WorkOrderStatusHistory, WorkOrderAssignment
from app.models.technician import Technician
from app.models.customer import Customer
from app.models.service import Service
from app.models.service_report import ServiceReport
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import (
    UserRole,
    WorkOrderStatus,
    NotificationType,
    TechnicianAvailabilityStatus,
)
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderAssignRequest,
    WorkOrderRescheduleRequest,
    WorkOrderCancelRequest,
    WorkOrderHoldRequest,
    WorkOrderCompleteRequest,
    WorkOrderResponse,
    WorkOrderDetailResponse,
    StatusHistoryItem,
    AssignmentHistoryItem,
)
from app.schemas.base import APIResponse

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])

def get_utc_now():
    return datetime.now(timezone.utc)

def generate_wo_number() -> str:
    now = datetime.now()
    rand = secrets.randbelow(90000) + 10000
    return f"WO-{now.strftime('%Y%m')}-{rand}"

# Valid status transitions
VALID_TRANSITIONS = {
    WorkOrderStatus.DRAFT.value: [WorkOrderStatus.SCHEDULED.value, WorkOrderStatus.ASSIGNED.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.SCHEDULED.value: [WorkOrderStatus.ASSIGNED.value, WorkOrderStatus.EN_ROUTE.value, WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.ASSIGNED.value: [WorkOrderStatus.EN_ROUTE.value, WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.SCHEDULED.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.EN_ROUTE.value: [WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.ON_HOLD.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.IN_PROGRESS.value: [WorkOrderStatus.ON_HOLD.value, WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.ON_HOLD.value: [WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.CANCELLED.value],
    WorkOrderStatus.COMPLETED.value: [], # terminal without super admin override
    WorkOrderStatus.CANCELLED.value: [], # terminal
}

def log_status_change(db: Session, wo: WorkOrder, new_status: str, user_id: Optional[UUID], notes: Optional[str] = None):
    history = WorkOrderStatusHistory(
        work_order_id=wo.id,
        previous_status=wo.status,
        new_status=new_status,
        changed_by_user_id=user_id,
        notes=notes,
    )
    db.add(history)
    wo.status = new_status

def map_work_order_to_response(wo: WorkOrder) -> WorkOrderResponse:
    return WorkOrderResponse(
        id=wo.id,
        work_order_number=wo.work_order_number,
        customer_id=wo.customer_id,
        customer_name=wo.customer.name if wo.customer else None,
        customer_phone=wo.customer.phone if wo.customer else None,
        customer_email=wo.customer.email if wo.customer else None,
        service_id=wo.service_id,
        service_name=wo.service.name if wo.service else None,
        service_category_name=wo.service.category.name if wo.service and wo.service.category else None,
        service_request_id=wo.service_request_id,
        assigned_technician_id=wo.assigned_technician_id,
        technician_name=wo.assigned_technician.user.full_name if wo.assigned_technician and wo.assigned_technician.user else None,
        technician_phone=wo.assigned_technician.user.phone if wo.assigned_technician and wo.assigned_technician.user else None,
        service_location=wo.service_location,
        description=wo.description,
        priority=wo.priority,
        status=wo.status,
        scheduled_start=wo.scheduled_start,
        scheduled_end=wo.scheduled_end,
        actual_start=wo.actual_start,
        actual_end=wo.actual_end,
        estimated_cost=float(wo.estimated_cost),
        actual_cost=float(wo.actual_cost) if wo.actual_cost is not None else None,
        cancellation_reason=wo.cancellation_reason,
        hold_reason=wo.hold_reason,
        completion_notes=wo.completion_notes,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
    )

@router.post("", response_model=APIResponse[WorkOrderResponse], status_code=status.HTTP_201_CREATED)
def create_work_order(
    req: WorkOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    # Only staff can create work orders directly
    if current_user.role == UserRole.CUSTOMER.value:
        raise ForbiddenException(code="FORBIDDEN", message="Customers create Service Requests, which are then scheduled as Work Orders.")

    customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
    if not customer:
        raise NotFoundException(code="CUSTOMER_NOT_FOUND", message="Specified customer does not exist.")

    service = db.query(Service).filter(Service.id == req.service_id).first()
    if not service:
        raise NotFoundException(code="SERVICE_NOT_FOUND", message="Specified service does not exist.")

    initial_status = WorkOrderStatus.DRAFT.value
    if req.assigned_technician_id and req.scheduled_start and req.scheduled_end:
        # Validate scheduling conflict & availability
        validate_technician_availability(
            db=db,
            technician_id=req.assigned_technician_id,
            start_time=req.scheduled_start,
            end_time=req.scheduled_end,
            service_id=service.id,
        )
        initial_status = WorkOrderStatus.ASSIGNED.value
    elif req.scheduled_start and req.scheduled_end:
        initial_status = WorkOrderStatus.SCHEDULED.value

    wo = WorkOrder(
        work_order_number=generate_wo_number(),
        customer_id=req.customer_id,
        service_id=req.service_id,
        service_request_id=req.service_request_id,
        assigned_technician_id=req.assigned_technician_id,
        service_location=req.service_location,
        description=req.description,
        priority=req.priority.value,
        status=initial_status,
        scheduled_start=req.scheduled_start,
        scheduled_end=req.scheduled_end,
        estimated_cost=req.estimated_cost or service.base_price,
    )
    db.add(wo)
    db.flush()

    # Track status history
    log_status_change(db, wo, initial_status, current_user.id, "Work order created")

    # Record assignment if assigned
    if req.assigned_technician_id and req.scheduled_start and req.scheduled_end:
        assignment = WorkOrderAssignment(
            work_order_id=wo.id,
            technician_id=req.assigned_technician_id,
            assigned_by_user_id=current_user.id,
            scheduled_start=req.scheduled_start,
            scheduled_end=req.scheduled_end,
        )
        db.add(assignment)

        # Notify technician
        tech = db.query(Technician).filter(Technician.id == req.assigned_technician_id).first()
        if tech and tech.user_id:
            db.add(Notification(
                user_id=tech.user_id,
                title="New Work Order Assigned",
                message=f"You have been assigned to work order {wo.work_order_number} for {service.name}.",
                type=NotificationType.TECHNICIAN_ASSIGNED.value,
                link_url=f"/work-orders/{wo.id}",
            ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order created successfully.", data=map_work_order_to_response(wo))

@router.get("", response_model=APIResponse[List[WorkOrderResponse]])
def list_work_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    technician_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(WorkOrder).join(Customer).join(Service)

    if current_user.role == UserRole.CUSTOMER.value:
        customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not customer:
            return APIResponse(success=True, data=[])
        query = query.filter(WorkOrder.customer_id == customer.id)
    elif current_user.role == UserRole.FIELD_TECHNICIAN.value:
        tech = db.query(Technician).filter(Technician.user_id == current_user.id).first()
        if not tech:
            return APIResponse(success=True, data=[])
        query = query.filter(WorkOrder.assigned_technician_id == tech.id)
    else:
        if customer_id:
            query = query.filter(WorkOrder.customer_id == customer_id)
        if technician_id:
            query = query.filter(WorkOrder.assigned_technician_id == technician_id)

    if status_filter:
        if status_filter.upper() == "UNASSIGNED":
            query = query.filter(WorkOrder.assigned_technician_id == None)
        else:
            query = query.filter(WorkOrder.status == status_filter)
    if priority:
        query = query.filter(WorkOrder.priority == priority)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                WorkOrder.work_order_number.ilike(s),
                WorkOrder.service_location.ilike(s),
                WorkOrder.description.ilike(s),
                Customer.name.ilike(s),
                Service.name.ilike(s),
            )
        )

    orders = query.order_by(desc(WorkOrder.created_at)).all()
    data = [map_work_order_to_response(wo) for wo in orders]
    return APIResponse(success=True, data=data)

@router.get("/{work_order_id}", response_model=APIResponse[WorkOrderDetailResponse])
def get_work_order(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if current_user.role == UserRole.CUSTOMER.value and wo.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")
    if current_user.role == UserRole.FIELD_TECHNICIAN.value and (not wo.assigned_technician or wo.assigned_technician.user_id != current_user.id):
        raise ForbiddenException(code="ACCESS_DENIED", message="Access denied to unassigned work order.")

    base_resp = map_work_order_to_response(wo)

    # Status history
    histories = [
        StatusHistoryItem(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by_name=h.changed_by.full_name if h.changed_by else "System",
            notes=h.notes,
            created_at=h.created_at,
        ) for h in wo.status_history
    ]

    # Assignments
    assignments = [
        AssignmentHistoryItem(
            id=a.id,
            technician_id=a.technician_id,
            technician_name=a.technician.user.full_name if a.technician and a.technician.user else "Technician",
            assigned_by_name=a.assigned_by.full_name if a.assigned_by else "Dispatcher",
            scheduled_start=a.scheduled_start,
            scheduled_end=a.scheduled_end,
            assigned_at=a.assigned_at,
            unassigned_at=a.unassigned_at,
            reason=a.reason,
        ) for a in wo.assignments
    ]

    parts_list = []
    for p in wo.parts_consumed:
        parts_list.append({
            "id": str(p.id),
            "part_id": str(p.part_id),
            "sku": p.part.sku if p.part else "N/A",
            "name": p.part.name if p.part else "Part",
            "quantity": p.quantity,
            "unit_price": float(p.unit_price),
            "total_price": float(p.unit_price * p.quantity),
            "status": p.status,
        })

    detail = WorkOrderDetailResponse(
        **base_resp.model_dump(),
        status_history=histories,
        assignments=assignments,
        parts_consumed=parts_list,
        has_report=bool(wo.service_report),
        has_feedback=bool(wo.feedback),
    )
    return APIResponse(success=True, data=detail)

@router.patch("/{work_order_id}", response_model=APIResponse[WorkOrderResponse])
def update_work_order(
    work_order_id: UUID,
    req: WorkOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status == WorkOrderStatus.COMPLETED.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise ConflictException(
            code="COMPLETED_ORDER_IMMUTABLE",
            message="Completed work orders cannot be modified without an authorized super-admin correction workflow."
        )

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "status" and val is not None:
            new_st = val.value if hasattr(val, 'value') else val
            if new_st != wo.status:
                allowed = VALID_TRANSITIONS.get(wo.status, [])
                if new_st not in allowed and current_user.role != UserRole.SUPER_ADMIN.value:
                    raise ConflictException(
                        code="INVALID_WORK_ORDER_TRANSITION",
                        message=f"Cannot transition status from {wo.status} to {new_st}. Allowed: {allowed}"
                    )
                log_status_change(db, wo, new_st, current_user.id, "Status manually updated")
        elif val is not None:
            if hasattr(val, 'value'):
                setattr(wo, field, val.value)
            else:
                setattr(wo, field, val)

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order updated.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/assign", response_model=APIResponse[WorkOrderResponse])
def assign_technician(
    work_order_id: UUID,
    req: WorkOrderAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status in [WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value]:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message=f"Cannot assign technician to {wo.status} work order.")

    # Validate technician availability & prevent scheduling conflicts with row locking
    tech = validate_technician_availability(
        db=db,
        technician_id=req.technician_id,
        start_time=req.scheduled_start,
        end_time=req.scheduled_end,
        exclude_work_order_id=wo.id,
        service_id=wo.service_id,
    )

    # If previously assigned to another technician, mark previous assignment unassigned
    if wo.assigned_technician_id and wo.assigned_technician_id != req.technician_id:
        prev_assign = db.query(WorkOrderAssignment).filter(
            WorkOrderAssignment.work_order_id == wo.id,
            WorkOrderAssignment.technician_id == wo.assigned_technician_id,
            WorkOrderAssignment.unassigned_at == None,
        ).first()
        if prev_assign:
            prev_assign.unassigned_at = get_utc_now()
            prev_assign.reason = "Reassigned to another technician"

    wo.assigned_technician_id = req.technician_id
    wo.scheduled_start = req.scheduled_start
    wo.scheduled_end = req.scheduled_end

    new_st = WorkOrderStatus.ASSIGNED.value
    log_status_change(db, wo, new_st, current_user.id, f"Assigned to {tech.user.full_name if tech.user else 'Technician'}")

    # Record assignment
    assignment = WorkOrderAssignment(
        work_order_id=wo.id,
        technician_id=req.technician_id,
        assigned_by_user_id=current_user.id,
        scheduled_start=req.scheduled_start,
        scheduled_end=req.scheduled_end,
        reason=req.notes,
    )
    db.add(assignment)

    # Notify technician & customer
    if tech.user_id:
        db.add(Notification(
            user_id=tech.user_id,
            title="Work Order Assignment",
            message=f"You have been assigned to {wo.work_order_number} for {req.scheduled_start.strftime('%Y-%m-%d %H:%M')}.",
            type=NotificationType.TECHNICIAN_ASSIGNED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    if wo.customer and wo.customer.user_id:
        db.add(Notification(
            user_id=wo.customer.user_id,
            title="Technician Assigned",
            message=f"Technician {tech.user.full_name if tech.user else 'A specialist'} has been assigned to your service appointment on {req.scheduled_start.strftime('%Y-%m-%d at %H:%M')}.",
            type=NotificationType.TECHNICIAN_ASSIGNED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Technician assigned successfully.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/reschedule", response_model=APIResponse[WorkOrderResponse])
def reschedule_work_order(
    work_order_id: UUID,
    req: WorkOrderRescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status in [WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value]:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message=f"Cannot reschedule {wo.status} work order.")

    target_tech_id = req.technician_id or wo.assigned_technician_id
    if not target_tech_id:
        raise BadRequestException(code="NO_TECHNICIAN_SPECIFIED", message="Please specify a technician or assign one first.")

    # Validate target technician availability
    tech = validate_technician_availability(
        db=db,
        technician_id=target_tech_id,
        start_time=req.scheduled_start,
        end_time=req.scheduled_end,
        exclude_work_order_id=wo.id,
        service_id=wo.service_id,
    )

    old_start_str = wo.scheduled_start.strftime('%Y-%m-%d %H:%M') if wo.scheduled_start else "Unscheduled"
    wo.assigned_technician_id = target_tech_id
    wo.scheduled_start = req.scheduled_start
    wo.scheduled_end = req.scheduled_end
    wo.status = WorkOrderStatus.ASSIGNED.value

    log_status_change(
        db, wo, WorkOrderStatus.ASSIGNED.value, current_user.id,
        f"Rescheduled from {old_start_str} to {req.scheduled_start.strftime('%Y-%m-%d %H:%M')}. Reason: {req.reason}"
    )

    assignment = WorkOrderAssignment(
        work_order_id=wo.id,
        technician_id=target_tech_id,
        assigned_by_user_id=current_user.id,
        scheduled_start=req.scheduled_start,
        scheduled_end=req.scheduled_end,
        reason=f"Rescheduled: {req.reason}",
    )
    db.add(assignment)

    # Notifications
    if tech.user_id:
        db.add(Notification(
            user_id=tech.user_id,
            title="Appointment Rescheduled",
            message=f"Work Order {wo.work_order_number} has been rescheduled to {req.scheduled_start.strftime('%Y-%m-%d %H:%M')}.",
            type=NotificationType.APPOINTMENT_RESCHEDULED.value,
            link_url=f"/work-orders/{wo.id}",
        ))
    if wo.customer and wo.customer.user_id:
        db.add(Notification(
            user_id=wo.customer.user_id,
            title="Appointment Rescheduled",
            message=f"Your appointment {wo.work_order_number} has been rescheduled to {req.scheduled_start.strftime('%Y-%m-%d at %H:%M')}.",
            type=NotificationType.APPOINTMENT_RESCHEDULED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order rescheduled successfully.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/start", response_model=APIResponse[WorkOrderResponse])
def start_work_order(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    # Permissions: assigned technician or staff
    if current_user.role == UserRole.FIELD_TECHNICIAN.value:
        if not wo.assigned_technician or wo.assigned_technician.user_id != current_user.id:
            raise ForbiddenException(code="ACCESS_DENIED", message="Only the assigned technician can start this job.")

    if wo.status not in [WorkOrderStatus.ASSIGNED.value, WorkOrderStatus.SCHEDULED.value, WorkOrderStatus.EN_ROUTE.value, WorkOrderStatus.ON_HOLD.value]:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message=f"Cannot start work order from state {wo.status}.")

    if not wo.actual_start:
        wo.actual_start = get_utc_now()

    log_status_change(db, wo, WorkOrderStatus.IN_PROGRESS.value, current_user.id, "Technician started work on site")

    # Update technician availability to BUSY
    if wo.assigned_technician:
        wo.assigned_technician.availability_status = TechnicianAvailabilityStatus.BUSY.value

    # Notify customer
    if wo.customer and wo.customer.user_id:
        db.add(Notification(
            user_id=wo.customer.user_id,
            title="Service Started",
            message=f"Technician has begun service operations for work order {wo.work_order_number}.",
            type=NotificationType.WORK_STARTED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Job is now in progress.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/hold", response_model=APIResponse[WorkOrderResponse])
def hold_work_order(
    work_order_id: UUID,
    req: WorkOrderHoldRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status != WorkOrderStatus.IN_PROGRESS.value:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message="Only in-progress jobs can be put on hold.")

    wo.hold_reason = req.hold_reason
    log_status_change(db, wo, WorkOrderStatus.ON_HOLD.value, current_user.id, f"Placed on hold: {req.hold_reason}")

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order placed on hold.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/resume", response_model=APIResponse[WorkOrderResponse])
def resume_work_order(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status != WorkOrderStatus.ON_HOLD.value:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message="Only on-hold jobs can be resumed.")

    wo.hold_reason = None
    log_status_change(db, wo, WorkOrderStatus.IN_PROGRESS.value, current_user.id, "Work resumed")

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order resumed.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/complete", response_model=APIResponse[WorkOrderResponse])
def complete_work_order(
    work_order_id: UUID,
    req: WorkOrderCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status not in [WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.ON_HOLD.value, WorkOrderStatus.ASSIGNED.value]:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message=f"Cannot complete work order in {wo.status} state.")

    now = get_utc_now()
    wo.actual_end = now
    if not wo.actual_start:
        wo.actual_start = wo.scheduled_start or now

    # Calculate actual cost if not passed: base + parts
    if req.actual_cost is not None:
        wo.actual_cost = req.actual_cost
    else:
        parts_sum = sum([float(p.unit_price * p.quantity) for p in wo.parts_consumed])
        wo.actual_cost = float(wo.estimated_cost or 0.0) + parts_sum

    wo.completion_notes = req.work_summary
    log_status_change(db, wo, WorkOrderStatus.COMPLETED.value, current_user.id, f"Completed: {req.work_summary}")

    # Set technician availability back to AVAILABLE
    if wo.assigned_technician:
        wo.assigned_technician.availability_status = TechnicianAvailabilityStatus.AVAILABLE.value

    # Auto-generate or link Service Report if not already existing
    existing_report = db.query(ServiceReport).filter(ServiceReport.work_order_id == wo.id).first()
    if not existing_report and wo.assigned_technician_id:
        report = ServiceReport(
            work_order_id=wo.id,
            technician_id=wo.assigned_technician_id,
            work_summary=req.work_summary,
            diagnosis=req.diagnosis or "Issue analyzed and remediated.",
            actions_performed=req.actions_performed or "Standard field service protocol executed.",
            start_time=wo.actual_start,
            completion_time=now,
            customer_remarks=req.customer_remarks,
            recommendations=req.recommendations,
            parts_used=[
                {
                    "sku": p.part.sku if p.part else "N/A",
                    "name": p.part.name if p.part else "Part",
                    "quantity": p.quantity,
                    "unit_price": float(p.unit_price)
                } for p in wo.parts_consumed
            ]
        )
        db.add(report)

    # Notify Customer of job completion
    if wo.customer and wo.customer.user_id:
        db.add(Notification(
            user_id=wo.customer.user_id,
            title="Work Order Completed",
            message=f"Work order {wo.work_order_number} has been completed! You can now review the service report and leave feedback.",
            type=NotificationType.WORK_COMPLETED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order marked as completed.", data=map_work_order_to_response(wo))

@router.post("/{work_order_id}/cancel", response_model=APIResponse[WorkOrderResponse])
def cancel_work_order(
    work_order_id: UUID,
    req: WorkOrderCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if wo.status in [WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value]:
        raise ConflictException(code="INVALID_WORK_ORDER_TRANSITION", message=f"Cannot cancel a work order in {wo.status} state.")

    wo.cancellation_reason = req.cancellation_reason
    log_status_change(db, wo, WorkOrderStatus.CANCELLED.value, current_user.id, f"Cancelled: {req.cancellation_reason}")

    # Release technician availability if busy
    if wo.assigned_technician:
        wo.assigned_technician.availability_status = TechnicianAvailabilityStatus.AVAILABLE.value

    # Notify technician and customer
    if wo.assigned_technician and wo.assigned_technician.user_id:
        db.add(Notification(
            user_id=wo.assigned_technician.user_id,
            title="Work Order Cancelled",
            message=f"Work order {wo.work_order_number} has been cancelled. Reason: {req.cancellation_reason}",
            type=NotificationType.APPOINTMENT_CANCELLED.value,
            link_url=f"/work-orders/{wo.id}",
        ))
    if wo.customer and wo.customer.user_id:
        db.add(Notification(
            user_id=wo.customer.user_id,
            title="Work Order Cancelled",
            message=f"Your work order {wo.work_order_number} has been cancelled. Reason: {req.cancellation_reason}",
            type=NotificationType.APPOINTMENT_CANCELLED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(wo)
    return APIResponse(success=True, message="Work order cancelled.", data=map_work_order_to_response(wo))
