from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.models.technician import Technician, TechnicianSkill, TechnicianAvailability
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.feedback import Feedback
from app.models.enums import UserRole, WorkOrderStatus, EmploymentStatus, TechnicianAvailabilityStatus
from app.schemas.technician import (
    TechnicianCreate,
    TechnicianUpdate,
    TechnicianResponse,
    TechnicianDetailResponse,
    TechnicianAvailabilityCreate,
    TechnicianAvailabilityResponse,
    SkillItem,
)
from app.schemas.work_order import WorkOrderResponse
from app.schemas.base import APIResponse

router = APIRouter(prefix="/technicians", tags=["Technician Management"])

ADMIN_AND_DISPATCHER_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
    UserRole.DISPATCHER,
]

def map_technician_to_response(tech: Technician, db: Session) -> TechnicianResponse:
    now = datetime.now(timezone.utc)
    active_statuses = [
        WorkOrderStatus.SCHEDULED.value,
        WorkOrderStatus.ASSIGNED.value,
        WorkOrderStatus.EN_ROUTE.value,
        WorkOrderStatus.IN_PROGRESS.value,
        WorkOrderStatus.ON_HOLD.value,
    ]
    workload = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech.id,
        WorkOrder.status.in_(active_statuses),
    ).count()

    skills = [
        SkillItem(skill_name=s.skill_name, proficiency_level=s.proficiency_level)
        for s in tech.skills
    ]

    # Evaluate dynamic availability:
    # 1. Check if technician has active leaves right now
    has_active_leave = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.technician_id == tech.id,
        TechnicianAvailability.start_time <= now,
        TechnicianAvailability.end_time >= now,
    ).first() is not None

    if tech.employment_status == EmploymentStatus.INACTIVE.value:
        effective_avail = TechnicianAvailabilityStatus.INACTIVE.value
    elif has_active_leave or tech.availability_status == TechnicianAvailabilityStatus.ON_LEAVE.value:
        effective_avail = TechnicianAvailabilityStatus.ON_LEAVE.value
    else:
        # 2. Check if technician currently has an ongoing job active right now
        has_ongoing_job = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status == WorkOrderStatus.IN_PROGRESS.value,
            WorkOrder.scheduled_start <= now,
            WorkOrder.scheduled_end >= now,
        ).first() is not None

        if has_ongoing_job:
            effective_avail = TechnicianAvailabilityStatus.BUSY.value
        else:
            effective_avail = TechnicianAvailabilityStatus.AVAILABLE.value

    # Auto-synchronize in the DB if the status drifted
    if tech.availability_status != effective_avail:
        tech.availability_status = effective_avail
        try:
            db.add(tech)
            db.commit()
            db.refresh(tech)
        except Exception:
            db.rollback()

    return TechnicianResponse(
        id=tech.id,
        user_id=tech.user_id,
        full_name=tech.user.full_name if tech.user else None,
        email=tech.user.email if tech.user else None,
        phone=tech.user.phone if tech.user else None,
        assigned_region=tech.assigned_region,
        employment_status=tech.employment_status,
        availability_status=tech.availability_status,
        work_start_time=tech.work_start_time,
        work_end_time=tech.work_end_time,
        working_days=tech.working_days or [1, 2, 3, 4, 5],
        service_categories=tech.service_categories or [],
        skills=skills,
        current_workload=workload,
        created_at=tech.created_at,
        updated_at=tech.updated_at,
    )

@router.post("", response_model=APIResponse[TechnicianResponse], status_code=status.HTTP_201_CREATED)
def create_technician(
    req: TechnicianCreate,
    current_user: User = Depends(require_roles(ADMIN_AND_DISPATCHER_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    user = None
    if req.user_id:
        user = db.query(User).filter(User.id == req.user_id).first()
        if not user:
            raise NotFoundException(code="USER_NOT_FOUND", message="User account not found.")
    elif req.email:
        clean_email = req.email.lower().strip()
        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            if not req.full_name:
                raise BadRequestException(code="INVALID_PAYLOAD", message="Full name is required for new technician.")
            user = User(
                email=clean_email,
                password_hash=get_password_hash(req.password or "Tech@123"),
                full_name=req.full_name.strip(),
                phone=req.phone,
                role=UserRole.FIELD_TECHNICIAN.value,
                is_active=True,
            )
            db.add(user)
            db.flush()
    else:
        raise BadRequestException(code="INVALID_PAYLOAD", message="Either user_id or email and full_name are required.")

    existing = db.query(Technician).filter(Technician.user_id == user.id).first()
    if existing:
        raise ConflictException(code="TECHNICIAN_EXISTS", message="Technician profile already exists for this user.")

    # Update role to field technician if not already
    user.role = UserRole.FIELD_TECHNICIAN.value

    tech = Technician(
        user_id=user.id,
        assigned_region=req.assigned_region,
        employment_status=req.employment_status.value,
        work_start_time=req.work_start_time,
        work_end_time=req.work_end_time,
        working_days=req.working_days,
        service_categories=req.service_categories,
    )
    db.add(tech)
    db.flush()

    for s in req.skills:
        skill_obj = TechnicianSkill(
            technician_id=tech.id,
            skill_name=s.skill_name,
            proficiency_level=s.proficiency_level,
        )
        db.add(skill_obj)

    db.commit()
    db.refresh(tech)
    return APIResponse(success=True, message="Technician profile created successfully.", data=map_technician_to_response(tech, db))

@router.get("", response_model=APIResponse[List[TechnicianResponse]])
def list_technicians(
    region: Optional[str] = None,
    skill: Optional[str] = None,
    category: Optional[str] = None,
    availability: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    # Customers cannot browse technicians, staff can
    if current_user.role == UserRole.CUSTOMER.value:
        raise ForbiddenException(code="ACCESS_DENIED", message="Customers cannot browse all technicians.")

    query = db.query(Technician).join(User)

    if region:
        query = query.filter(Technician.assigned_region.ilike(f"%{region}%"))
    if availability:
        query = query.filter(Technician.availability_status == availability)

    technicians = query.all()
    results = []
    for t in technicians:
        resp = map_technician_to_response(t, db)
        if skill:
            skill_names = [s.skill_name.lower() for s in resp.skills]
            if skill.lower() not in skill_names:
                continue
        if category:
            cat_list = [c.lower() for c in resp.service_categories]
            if category.lower() not in cat_list:
                continue
        results.append(resp)

    return APIResponse(success=True, data=results)

@router.get("/{technician_id}", response_model=APIResponse[TechnicianDetailResponse])
def get_technician(
    technician_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise NotFoundException(code="TECHNICIAN_NOT_FOUND", message="Technician not found.")

    if current_user.role == UserRole.FIELD_TECHNICIAN.value and tech.user_id != current_user.id:
        raise ForbiddenException(code="ACCESS_DENIED", message="Technicians can only inspect their own profile.")

    base_resp = map_technician_to_response(tech, db)

    # Get availabilities/leaves
    leaves = [
        TechnicianAvailabilityResponse.model_validate(a)
        for a in tech.availabilities
    ]

    completed_jobs_count = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech.id,
        WorkOrder.status == WorkOrderStatus.COMPLETED.value,
    ).count()

    # Calculate average feedback rating
    avg_rating_query = db.query(func.avg(Feedback.rating)).join(WorkOrder).filter(
        WorkOrder.assigned_technician_id == tech.id
    ).scalar()
    avg_rating = float(avg_rating_query) if avg_rating_query else 5.0

    detail = TechnicianDetailResponse(
        **base_resp.model_dump(),
        availabilities=leaves,
        completed_jobs_count=completed_jobs_count,
        average_rating=round(avg_rating, 2),
    )
    return APIResponse(success=True, data=detail)

@router.patch("/{technician_id}", response_model=APIResponse[TechnicianResponse])
def update_technician(
    technician_id: UUID,
    req: TechnicianUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise NotFoundException(code="TECHNICIAN_NOT_FOUND", message="Technician not found.")

    # Technicians can update their availability status, but dispatchers/admins can update full profile
    is_admin = current_user.role in [r.value for r in ADMIN_AND_DISPATCHER_ROLES]
    is_self = (current_user.role == UserRole.FIELD_TECHNICIAN.value and tech.user_id == current_user.id)

    if not (is_admin or is_self):
        raise ForbiddenException(code="ACCESS_DENIED", message="Permission denied to update technician.")

    update_data = req.model_dump(exclude_unset=True)

    if not is_admin and is_self:
        # Self-technician can only toggle availability status
        if "availability_status" in update_data:
            tech.availability_status = update_data["availability_status"]
    else:
        for field, val in update_data.items():
            if field == "skills" and val is not None:
                # Replace skills
                db.query(TechnicianSkill).filter(TechnicianSkill.technician_id == tech.id).delete()
                for s in val:
                    db.add(TechnicianSkill(
                        technician_id=tech.id,
                        skill_name=s['skill_name'],
                        proficiency_level=s.get('proficiency_level', 'INTERMEDIATE')
                    ))
            elif val is not None:
                if hasattr(val, 'value'):
                    setattr(tech, field, val.value)
                else:
                    setattr(tech, field, val)

    db.commit()
    db.refresh(tech)
    return APIResponse(success=True, message="Technician profile updated successfully.", data=map_technician_to_response(tech, db))

@router.get("/{technician_id}/availability", response_model=APIResponse[List[TechnicianAvailabilityResponse]])
def get_technician_availability(
    technician_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise NotFoundException(code="TECHNICIAN_NOT_FOUND", message="Technician not found.")

    availabilities = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.technician_id == technician_id
    ).order_by(TechnicianAvailability.start_time).all()

    data = [TechnicianAvailabilityResponse.model_validate(a) for a in availabilities]
    return APIResponse(success=True, data=data)

@router.post("/{technician_id}/availability", response_model=APIResponse[TechnicianAvailabilityResponse], status_code=status.HTTP_201_CREATED)
def add_technician_availability(
    technician_id: UUID,
    req: TechnicianAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise NotFoundException(code="TECHNICIAN_NOT_FOUND", message="Technician not found.")

    is_admin = current_user.role in [r.value for r in ADMIN_AND_DISPATCHER_ROLES]
    is_self = (current_user.role == UserRole.FIELD_TECHNICIAN.value and tech.user_id == current_user.id)
    if not (is_admin or is_self):
        raise ForbiddenException(code="ACCESS_DENIED", message="Permission denied to add availability record.")

    if req.start_time >= req.end_time:
        raise BadRequestException(code="INVALID_DATES", message="Start time must be before end time.")

    record = TechnicianAvailability(
        technician_id=technician_id,
        start_time=req.start_time,
        end_time=req.end_time,
        type=req.type.value,
        reason=req.reason,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return APIResponse(
        success=True,
        message="Technician leave/unavailability scheduled.",
        data=TechnicianAvailabilityResponse.model_validate(record)
    )

@router.get("/{technician_id}/work-orders", response_model=APIResponse[List[WorkOrderResponse]])
def get_technician_work_orders(
    technician_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise NotFoundException(code="TECHNICIAN_NOT_FOUND", message="Technician not found.")

    if current_user.role == UserRole.FIELD_TECHNICIAN.value and tech.user_id != current_user.id:
        raise ForbiddenException(code="ACCESS_DENIED", message="Technicians can only view their own assigned work orders.")

    query = db.query(WorkOrder).filter(WorkOrder.assigned_technician_id == technician_id)
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)

    work_orders = query.order_by(desc(WorkOrder.scheduled_start)).all()
    results = []
    for wo in work_orders:
        results.append(WorkOrderResponse(
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
        ))

    return APIResponse(success=True, data=results)
