import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class ServiceReport(Base):
    __tablename__ = "service_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="RESTRICT"), nullable=False, index=True)

    work_summary = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=False)
    actions_performed = Column(Text, nullable=False)
    parts_used = Column(JSON, nullable=False, default=list) # snapshot of parts list
    start_time = Column(DateTime(timezone=True), nullable=False)
    completion_time = Column(DateTime(timezone=True), nullable=False)
    customer_remarks = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    work_order = relationship("WorkOrder", back_populates="service_report")
    technician = relationship("Technician", back_populates="service_reports")
    attachments = relationship("ReportAttachment", back_populates="report", cascade="all, delete-orphan")

class ReportAttachment(Base):
    __tablename__ = "report_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("service_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False) # bytes
    content_type = Column(String(100), nullable=False)
    attachment_type = Column(String(50), nullable=False, default="DOCUMENT") # BEFORE_PHOTO, AFTER_PHOTO, DOCUMENT, SIGNATURE
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    report = relationship("ServiceReport", back_populates="attachments")
