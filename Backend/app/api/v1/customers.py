from typing import Any, List, Optional
from uuid import UUID
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
from app.models.customer import Customer
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.service_request import ServiceRequest
from app.models.feedback import Feedback
from app.models.enums import UserRole, WorkOrderStatus
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerDetailResponse,
    CustomerHistoryItem,
    CustomerServiceHistoryResponse,
)
from app.schemas.base import APIResponse

router = APIRouter(prefix="/customers", tags=["Customer Management"])

STAFF_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
    UserRole.DISPATCHER,
    UserRole.FIELD_TECHNICIAN,
]

@router.post("", response_model=APIResponse[CustomerResponse], status_code=status.HTTP_201_CREATED)
def create_customer(
    req: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    # Only staff or self-registration can create
    if current_user.role == UserRole.CUSTOMER.value:
        # A customer user can only link themselves
        req.user_id = current_user.id
        existing = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if existing:
            raise ConflictException(code="CUSTOMER_EXISTS", message="Customer profile already exists for this account.")
    elif current_user.role not in [r.value for r in STAFF_ROLES]:
        raise ForbiddenException(code="FORBIDDEN", message="Permission denied.")

    # Check unique email
    existing_email = db.query(Customer).filter(Customer.email == req.email.lower()).first()
    if existing_email:
        raise ConflictException(code="EMAIL_EXISTS", message="A customer record with this email already exists.")

    customer = Customer(
        user_id=req.user_id,
        name=req.name,
        email=req.email.lower(),
        phone=req.phone,
        address=req.address,
        service_location=req.service_location,
        customer_type=req.customer_type.value,
        status=req.status.value,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return APIResponse(
        success=True,
        message="Customer created successfully.",
        data=CustomerResponse.model_validate(customer)
    )

@router.get("", response_model=APIResponse[List[CustomerResponse]])
def list_customers(
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(Customer)

    # Role-based restriction: Customers can only see their own record
    if current_user.role == UserRole.CUSTOMER.value:
        query = query.filter(Customer.user_id == current_user.id)
    else:
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Customer.name.ilike(s),
                    Customer.email.ilike(s),
                    Customer.phone.ilike(s),
                    Customer.service_location.ilike(s),
                )
            )
        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)
        if status_filter:
            query = query.filter(Customer.status == status_filter)

    total_customers = query.order_by(desc(Customer.created_at)).offset(skip).limit(limit).all()
    data = [CustomerResponse.model_validate(c) for c in total_customers]
    return APIResponse(success=True, data=data)

@router.get("/{customer_id}", response_model=APIResponse[CustomerDetailResponse])
def get_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise NotFoundException(code="CUSTOMER_NOT_FOUND", message="Customer not found.")

    if current_user.role == UserRole.CUSTOMER.value and customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied to this customer profile.")

    active_statuses = [
        WorkOrderStatus.SCHEDULED.value,
        WorkOrderStatus.ASSIGNED.value,
        WorkOrderStatus.EN_ROUTE.value,
        WorkOrderStatus.IN_PROGRESS.value,
        WorkOrderStatus.ON_HOLD.value,
    ]
    active_wo_count = db.query(WorkOrder).filter(
        WorkOrder.customer_id == customer.id,
        WorkOrder.status.in_(active_statuses),
    ).count()

    sr_count = db.query(ServiceRequest).filter(ServiceRequest.customer_id == customer.id).count()

    completed_wos = db.query(WorkOrder).filter(
        WorkOrder.customer_id == customer.id,
        WorkOrder.status == WorkOrderStatus.COMPLETED.value,
    ).all()
    total_spent = sum([float(w.actual_cost or w.estimated_cost or 0.0) for w in completed_wos])

    resp = CustomerDetailResponse(
        id=customer.id,
        user_id=customer.user_id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address,
        service_location=customer.service_location,
        customer_type=customer.customer_type,
        status=customer.status,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        active_work_orders_count=active_wo_count,
        total_service_requests_count=sr_count,
        total_spent=total_spent,
    )
    return APIResponse(success=True, data=resp)

@router.patch("/{customer_id}", response_model=APIResponse[CustomerResponse])
def update_customer(
    customer_id: UUID,
    req: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise NotFoundException(code="CUSTOMER_NOT_FOUND", message="Customer not found.")

    if current_user.role == UserRole.CUSTOMER.value and customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied to update this profile.")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if hasattr(val, 'value'):
                setattr(customer, field, val.value)
            else:
                setattr(customer, field, val)

    db.commit()
    db.refresh(customer)
    return APIResponse(success=True, message="Customer updated successfully.", data=CustomerResponse.model_validate(customer))

@router.get("/{customer_id}/service-history", response_model=APIResponse[CustomerServiceHistoryResponse])
def get_customer_service_history(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise NotFoundException(code="CUSTOMER_NOT_FOUND", message="Customer not found.")

    if current_user.role == UserRole.CUSTOMER.value and customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied to customer service history.")

    work_orders = db.query(WorkOrder).filter(
        WorkOrder.customer_id == customer.id
    ).order_by(desc(WorkOrder.created_at)).all()

    history_items = []
    for wo in work_orders:
        tech_name = wo.assigned_technician.user.full_name if wo.assigned_technician and wo.assigned_technician.user else None
        rating = wo.feedback.rating if wo.feedback else None
        cost = float(wo.actual_cost) if wo.actual_cost is not None else float(wo.estimated_cost or 0.0)

        history_items.append(CustomerHistoryItem(
            work_order_id=wo.id,
            work_order_number=wo.work_order_number,
            service_name=wo.service.name if wo.service else "Custom Service",
            status=wo.status,
            scheduled_start=wo.scheduled_start,
            completed_at=wo.actual_end,
            cost=cost,
            technician_name=tech_name,
            rating=rating,
        ))

    response_data = CustomerServiceHistoryResponse(
        customer=CustomerResponse.model_validate(customer),
        history=history_items,
    )
    return APIResponse(success=True, data=response_data)
