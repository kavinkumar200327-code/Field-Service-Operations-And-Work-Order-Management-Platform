import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)

    rating = Column(Integer, nullable=False) # 1 to 5
    timeliness_rating = Column(Integer, nullable=True) # 1 to 5
    quality_rating = Column(Integer, nullable=True) # 1 to 5
    professionalism_rating = Column(Integer, nullable=True) # 1 to 5
    comments = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_feedback_rating_range'),
    )

    work_order = relationship("WorkOrder", back_populates="feedback")
    customer = relationship("Customer", back_populates="feedbacks")
