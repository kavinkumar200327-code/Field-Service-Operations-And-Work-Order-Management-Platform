import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import WorkOrderStatus, PriorityLevel

def get_utc_now():
    return datetime.now(timezone.utc)

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False, index=True)
    service_request_id = Column(UUID(as_uuid=True), ForeignKey("service_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True, index=True)

    service_location = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False, default=PriorityLevel.MEDIUM.value, index=True)
    status = Column(String(50), nullable=False, default=WorkOrderStatus.DRAFT.value, index=True)

    scheduled_start = Column(DateTime(timezone=True), nullable=True, index=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True, index=True)

    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)

    estimated_cost = Column(Numeric(10, 2), nullable=False, default=0.00)
    actual_cost = Column(Numeric(10, 2), nullable=True)

    cancellation_reason = Column(Text, nullable=True)
    hold_reason = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="work_orders")
    service = relationship("Service", back_populates="work_orders")
    service_request = relationship("ServiceRequest", back_populates="work_orders")
    assigned_technician = relationship("Technician", back_populates="work_orders")
    
    status_history = relationship("WorkOrderStatusHistory", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderStatusHistory.created_at")
    assignments = relationship("WorkOrderAssignment", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderAssignment.assigned_at")
    parts_consumed = relationship("WorkOrderPart", back_populates="work_order", cascade="all, delete-orphan")
    service_report = relationship("ServiceReport", back_populates="work_order", uselist=False, cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="work_order", uselist=False, cascade="all, delete-orphan")

class WorkOrderStatusHistory(Base):
    __tablename__ = "work_order_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    work_order = relationship("WorkOrder", back_populates="status_history")
    changed_by = relationship("User")

class WorkOrderAssignment(Base):
    __tablename__ = "work_order_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    unassigned_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)

    work_order = relationship("WorkOrder", back_populates="assignments")
    technician = relationship("Technician", back_populates="assignments")
    assigned_by = relationship("User")
