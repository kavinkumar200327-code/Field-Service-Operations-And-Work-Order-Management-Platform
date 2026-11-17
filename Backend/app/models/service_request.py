import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import ServiceRequestStatus, PriorityLevel

def get_utc_now():
    return datetime.now(timezone.utc)

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False, index=True)
    service_location = Column(Text, nullable=False)
    preferred_schedule = Column(DateTime(timezone=True), nullable=True)
    priority = Column(String(50), nullable=False, default=PriorityLevel.MEDIUM.value, index=True)
    status = Column(String(50), nullable=False, default=ServiceRequestStatus.NEW.value, index=True)
    issue_description = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=False, default=list) # List of uploaded file urls / paths
    review_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="service_requests")
    service = relationship("Service", back_populates="service_requests")
    work_orders = relationship("WorkOrder", back_populates="service_request")
