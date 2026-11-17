import secrets
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.api.deps import get_current_user
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.models.service_request import ServiceRequest
from app.models.customer import Customer
from app.models.service import Service
from app.models.work_order import WorkOrder, WorkOrderStatusHistory
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import (
    UserRole,
    ServiceRequestStatus,
    WorkOrderStatus,
    NotificationType,
)
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestCancel,
    ServiceRequestConvertToWorkOrder,
    ServiceRequestResponse,
)
from app.schemas.work_order import WorkOrderResponse
from app.schemas.base import APIResponse

router = APIRouter(prefix="/service-requests", tags=["Service Requests"])

STAFF_ROLES = [
    UserRole.SUPER_ADMIN.value,
    UserRole.OPERATIONS_MANAGER.value,
    UserRole.DISPATCHER.value,
]

def generate_request_number() -> str:
    now = datetime.now()
    rand = secrets.randbelow(9000) + 1000
    return f"SR-{now.strftime('%Y%m')}-{rand}"

def generate_work_order_number() -> str:
    now = datetime.now()
    rand = secrets.randbelow(9000) + 1000
    return f"WO-{now.strftime('%Y%m')}-{rand}"

def map_request_to_response(sr: ServiceRequest) -> ServiceRequestResponse:
    return ServiceRequestResponse(
        id=sr.id,
        request_number=sr.request_number,
        customer_id=sr.customer_id,
        customer_name=sr.customer.name if sr.customer else None,
        customer_email=sr.customer.email if sr.customer else None,
        customer_phone=sr.customer.phone if sr.customer else None,
        service_id=sr.service_id,
        service_name=sr.service.name if sr.service else None,
        service_category_name=sr.service.category.name if sr.service and sr.service.category else None,
        service_location=sr.service_location,
        preferred_schedule=sr.preferred_schedule,
        priority=sr.priority,
        status=sr.status,
        issue_description=sr.issue_description,
        attachments=sr.attachments or [],
        review_notes=sr.review_notes,
        rejection_reason=sr.rejection_reason,
        cancellation_reason=sr.cancellation_reason,
        created_at=sr.created_at,
        updated_at=sr.updated_at,
    )

@router.post("", response_model=APIResponse[ServiceRequestResponse], status_code=status.HTTP_201_CREATED)
def create_service_request(
    req: ServiceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    # Validate service exists and is active
    service = db.query(Service).filter(Service.id == req.service_id).first()
    if not service:
        raise NotFoundException(code="SERVICE_NOT_FOUND", message="Specified service was not found.")
    if service.status != "ACTIVE":
        raise ConflictException(code="SERVICE_INACTIVE", message="Selected service is currently inactive and cannot be requested.")

    # Determine customer_id
    if current_user.role == UserRole.CUSTOMER.value:
        customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not customer:
            raise NotFoundException(code="CUSTOMER_PROFILE_MISSING", message="No customer profile linked to this account.")
        customer_id = customer.id
    else:
        if not req.customer_id:
            raise BadRequestException(code="CUSTOMER_ID_REQUIRED", message="Staff must specify a customer_id.")
        customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
        if not customer:
            raise NotFoundException(code="CUSTOMER_NOT_FOUND", message="Specified customer does not exist.")
        customer_id = req.customer_id

    sr = ServiceRequest(
        request_number=generate_request_number(),
        customer_id=customer_id,
        service_id=service.id,
        service_location=req.service_location,
        preferred_schedule=req.preferred_schedule,
        priority=req.priority.value,
        status=ServiceRequestStatus.NEW.value,
        issue_description=req.issue_description,
        attachments=req.attachments,
    )
    db.add(sr)
    db.flush()

    # Trigger notification for dispatchers & managers
    dispatchers = db.query(User).filter(
        User.role.in_(STAFF_ROLES),
        User.is_active == True,
    ).all()
    for d in dispatchers:
        notif = Notification(
            user_id=d.id,
            title="New Service Request Received",
            message=f"Request {sr.request_number} from {customer.name} for {service.name}.",
            type=NotificationType.SERVICE_REQUEST_RECEIVED.value,
            link_url=f"/service-requests",
        )
        db.add(notif)

    db.commit()
    db.refresh(sr)

    return APIResponse(
        success=True,
        message="Service request created successfully.",
        data=map_request_to_response(sr),
    )

@router.get("", response_model=APIResponse[List[ServiceRequestResponse]])
def list_service_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(ServiceRequest).join(Customer).join(Service)

    if current_user.role == UserRole.CUSTOMER.value:
        customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not customer:
            return APIResponse(success=True, data=[])
        query = query.filter(ServiceRequest.customer_id == customer.id)
    elif customer_id:
        query = query.filter(ServiceRequest.customer_id == customer_id)

    if status_filter:
        if status_filter.upper() == "ALL":
            pass
        else:
            query = query.filter(ServiceRequest.status == status_filter)
    else:
        # After conversion, service requests are removed from the active Service Request Screen
        query = query.filter(ServiceRequest.status != ServiceRequestStatus.CONVERTED.value)
    if priority:
        query = query.filter(ServiceRequest.priority == priority)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                ServiceRequest.request_number.ilike(s),
                ServiceRequest.service_location.ilike(s),
                ServiceRequest.issue_description.ilike(s),
                Customer.name.ilike(s),
                Service.name.ilike(s),
            )
        )

    requests = query.order_by(desc(ServiceRequest.created_at)).all()
    data = [map_request_to_response(r) for r in requests]
    return APIResponse(success=True, data=data)

@router.get("/{request_id}", response_model=APIResponse[ServiceRequestResponse])
def get_service_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not sr:
        raise NotFoundException(code="SERVICE_REQUEST_NOT_FOUND", message="Service request not found.")

    if current_user.role == UserRole.CUSTOMER.value and sr.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied to this service request.")

    return APIResponse(success=True, data=map_request_to_response(sr))

@router.patch("/{request_id}", response_model=APIResponse[ServiceRequestResponse])
def update_service_request(
    request_id: UUID,
    req: ServiceRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not sr:
        raise NotFoundException(code="SERVICE_REQUEST_NOT_FOUND", message="Service request not found.")

    if current_user.role == UserRole.CUSTOMER.value:
        if sr.customer.user_id != current_user.id:
            raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")
        if sr.status not in [ServiceRequestStatus.NEW.value, ServiceRequestStatus.UNDER_REVIEW.value]:
            raise ConflictException(code="CANNOT_EDIT_REQUEST", message="Cannot edit request once approved or converted.")
        # Customer can update issue description, location, preferred schedule
        if req.issue_description:
            sr.issue_description = req.issue_description
        if req.service_location:
            sr.service_location = req.service_location
        if req.preferred_schedule:
            sr.preferred_schedule = req.preferred_schedule
    else:
        # Staff can update status, review notes, priority
        update_data = req.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            if val is not None:
                if hasattr(val, 'value'):
                    setattr(sr, field, val.value)
                else:
                    setattr(sr, field, val)

    db.commit()
    db.refresh(sr)
    return APIResponse(success=True, message="Service request updated.", data=map_request_to_response(sr))

@router.post("/{request_id}/cancel", response_model=APIResponse[ServiceRequestResponse])
def cancel_service_request(
    request_id: UUID,
    req: ServiceRequestCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not sr:
        raise NotFoundException(code="SERVICE_REQUEST_NOT_FOUND", message="Service request not found.")

    if current_user.role == UserRole.CUSTOMER.value and sr.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")

    if sr.status in [ServiceRequestStatus.CONVERTED.value, ServiceRequestStatus.CANCELLED.value]:
        raise ConflictException(code="INVALID_STATUS_TRANSITION", message=f"Cannot cancel a request that is already {sr.status}.")

    sr.status = ServiceRequestStatus.CANCELLED.value
    sr.cancellation_reason = req.cancellation_reason
    db.commit()
    db.refresh(sr)

    return APIResponse(success=True, message="Service request cancelled.", data=map_request_to_response(sr))

@router.post("/{request_id}/convert-to-work-order", response_model=APIResponse[dict])
def convert_to_work_order(
    request_id: UUID,
    req: ServiceRequestConvertToWorkOrder,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    if current_user.role not in STAFF_ROLES:
        raise ForbiddenException(code="FORBIDDEN", message="Only dispatchers or managers can convert requests to work orders.")

    sr = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not sr:
        raise NotFoundException(code="SERVICE_REQUEST_NOT_FOUND", message="Service request not found.")

    if sr.status in [ServiceRequestStatus.CONVERTED.value, ServiceRequestStatus.CANCELLED.value, ServiceRequestStatus.REJECTED.value]:
        raise ConflictException(code="INVALID_STATUS_TRANSITION", message=f"Cannot convert request in {sr.status} state.")

    # Create new Work Order
    wo = WorkOrder(
        work_order_number=generate_work_order_number(),
        customer_id=sr.customer_id,
        service_id=sr.service_id,
        service_request_id=sr.id,
        service_location=sr.service_location,
        description=sr.issue_description,
        priority=req.priority.value if req.priority else sr.priority,
        status=WorkOrderStatus.SCHEDULED.value if req.scheduled_start else WorkOrderStatus.DRAFT.value,
        scheduled_start=req.scheduled_start,
        scheduled_end=req.scheduled_end,
        assigned_technician_id=req.assigned_technician_id,
        estimated_cost=sr.service.base_price,
    )
    db.add(wo)
    db.flush()

    # Track status history
    history = WorkOrderStatusHistory(
        work_order_id=wo.id,
        previous_status=None,
        new_status=wo.status,
        changed_by_user_id=current_user.id,
        notes=f"Converted from Service Request {sr.request_number}",
    )
    db.add(history)

    # Update service request status
    sr.status = ServiceRequestStatus.CONVERTED.value
    db.commit()

    return APIResponse(
        success=True,
        message="Service request successfully converted to work order.",
        data={
            "work_order_id": str(wo.id),
            "work_order_number": wo.work_order_number,
            "status": wo.status,
        }
    )
