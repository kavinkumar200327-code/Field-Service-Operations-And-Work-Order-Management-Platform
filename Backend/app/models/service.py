import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("service_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    estimated_duration = Column(Integer, nullable=False, default=60) # duration in minutes
    base_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    required_skills = Column(JSON, nullable=False, default=list) # e.g. ["HVAC Repair", "Refrigerant Handling"]
    required_parts = Column(JSON, nullable=False, default=list)  # e.g. [{"part_sku": "FILT-01", "quantity": 1}]
    status = Column(String(50), nullable=False, default="ACTIVE", index=True) # ACTIVE, INACTIVE

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    category = relationship("ServiceCategory", back_populates="services")
    service_requests = relationship("ServiceRequest", back_populates="service")
    work_orders = relationship("WorkOrder", back_populates="service")
