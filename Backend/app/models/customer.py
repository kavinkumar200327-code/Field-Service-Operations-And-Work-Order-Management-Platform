import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import CustomerType, CustomerStatus

def get_utc_now():
    return datetime.now(timezone.utc)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    service_location = Column(Text, nullable=False)
    customer_type = Column(String(50), nullable=False, default=CustomerType.INDIVIDUAL.value)
    status = Column(String(50), nullable=False, default=CustomerStatus.ACTIVE.value, index=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="customer_profile")
    service_requests = relationship("ServiceRequest", back_populates="customer", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="customer")
    feedbacks = relationship("Feedback", back_populates="customer")
