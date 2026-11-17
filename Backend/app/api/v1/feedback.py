from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.models.feedback import Feedback
from app.models.work_order import WorkOrder
from app.models.customer import Customer
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import UserRole, WorkOrderStatus, NotificationType
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.schemas.base import APIResponse

router = APIRouter(tags=["Customer Feedback"])

STAFF_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
    UserRole.DISPATCHER,
]

def map_feedback_response(fb: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=fb.id,
        work_order_id=fb.work_order_id,
        work_order_number=fb.work_order.work_order_number if fb.work_order else None,
        customer_id=fb.customer_id,
        customer_name=fb.customer.name if fb.customer else None,
        rating=fb.rating,
        timeliness_rating=fb.timeliness_rating,
        quality_rating=fb.quality_rating,
        professionalism_rating=fb.professionalism_rating,
        comments=fb.comments,
        created_at=fb.created_at,
    )

@router.post("/work-orders/{work_order_id}/feedback", response_model=APIResponse[FeedbackResponse], status_code=status.HTTP_201_CREATED)
def submit_feedback(
    work_order_id: UUID,
    req: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    # Must be completed
    if wo.status != WorkOrderStatus.COMPLETED.value:
        raise ConflictException(code="WORK_ORDER_NOT_COMPLETED", message="Feedback can only be provided for completed work orders.")

    # Customer check
    if current_user.role == UserRole.CUSTOMER.value:
        if wo.customer.user_id != current_user.id:
            raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="You can only provide feedback for your own orders.")

    # Duplicate check
    existing = db.query(Feedback).filter(Feedback.work_order_id == work_order_id).first()
    if existing:
        raise ConflictException(code="FEEDBACK_ALREADY_SUBMITTED", message="Feedback has already been submitted for this work order.")

    feedback = Feedback(
        work_order_id=wo.id,
        customer_id=wo.customer_id,
        rating=req.rating,
        timeliness_rating=req.timeliness_rating,
        quality_rating=req.quality_rating,
        professionalism_rating=req.professionalism_rating,
        comments=req.comments,
    )
    db.add(feedback)

    # Notify managers of customer feedback
    managers = db.query(User).filter(
        User.role.in_([UserRole.SUPER_ADMIN.value, UserRole.OPERATIONS_MANAGER.value]),
        User.is_active == True,
    ).all()
    for m in managers:
        db.add(Notification(
            user_id=m.id,
            title="Customer Feedback Received",
            message=f"Received a {req.rating}-star review for work order {wo.work_order_number}.",
            type=NotificationType.CUSTOMER_FEEDBACK_RECEIVED.value,
            link_url=f"/work-orders/{wo.id}",
        ))

    db.commit()
    db.refresh(feedback)

    return APIResponse(success=True, message="Thank you for your feedback!", data=map_feedback_response(feedback))

@router.get("/work-orders/{work_order_id}/feedback", response_model=APIResponse[Optional[FeedbackResponse]])
def get_work_order_feedback(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    feedback = db.query(Feedback).filter(Feedback.work_order_id == work_order_id).first()
    if not feedback:
        return APIResponse(success=True, data=None, message="No feedback recorded.")
    return APIResponse(success=True, data=map_feedback_response(feedback))

@router.get("/feedback", response_model=APIResponse[List[FeedbackResponse]])
def list_all_feedback(
    min_rating: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(Feedback).join(Customer).join(WorkOrder)

    if current_user.role == UserRole.CUSTOMER.value:
        query = query.filter(Feedback.customer_id == current_user.customer_profile.id)
    elif current_user.role == UserRole.FIELD_TECHNICIAN.value:
        query = query.filter(WorkOrder.assigned_technician_id == current_user.technician_profile.id)
    if min_rating:
        query = query.filter(Feedback.rating >= min_rating)

    feedbacks = query.order_by(desc(Feedback.created_at)).all()
    data = [map_feedback_response(f) for f in feedbacks]
    return APIResponse(success=True, data=data)
