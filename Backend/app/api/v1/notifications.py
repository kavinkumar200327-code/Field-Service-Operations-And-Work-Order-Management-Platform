from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundException
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationUnreadCount
from app.schemas.base import APIResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=APIResponse[List[NotificationResponse]])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(50).all()

    data = [NotificationResponse.model_validate(n) for n in notifs]
    return APIResponse(success=True, data=data)

@router.get("/unread-count", response_model=APIResponse[NotificationUnreadCount])
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()

    return APIResponse(success=True, data=NotificationUnreadCount(unread_count=count))

@router.patch("/{notification_id}/read", response_model=APIResponse[NotificationResponse])
def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notif:
        raise NotFoundException(code="NOTIFICATION_NOT_FOUND", message="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)

    return APIResponse(success=True, message="Marked as read.", data=NotificationResponse.model_validate(notif))

@router.patch("/read-all", response_model=APIResponse[dict])
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()

    return APIResponse(success=True, message="All notifications marked as read.", data={"updated": True})
