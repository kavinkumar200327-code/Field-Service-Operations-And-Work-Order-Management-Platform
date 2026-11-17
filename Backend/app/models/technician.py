import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import EmploymentStatus, TechnicianAvailabilityStatus, LeaveType

def get_utc_now():
    return datetime.now(timezone.utc)

class Technician(Base):
    __tablename__ = "technicians"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    assigned_region = Column(String(100), nullable=False, default="Metro Area", index=True)
    employment_status = Column(String(50), nullable=False, default=EmploymentStatus.FULL_TIME.value, index=True)
    availability_status = Column(String(50), nullable=False, default=TechnicianAvailabilityStatus.AVAILABLE.value, index=True)
    
    # Working hours configuration
    work_start_time = Column(String(10), nullable=False, default="08:00") # "HH:MM"
    work_end_time = Column(String(10), nullable=False, default="17:00")   # "HH:MM"
    working_days = Column(JSON, nullable=False, default=lambda: [1, 2, 3, 4, 5]) # 0=Mon or 1=Mon, let's use 1=Mon..7=Sun
    service_categories = Column(JSON, nullable=False, default=list) # List of category names or IDs

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="technician_profile")
    skills = relationship("TechnicianSkill", back_populates="technician", cascade="all, delete-orphan")
    availabilities = relationship("TechnicianAvailability", back_populates="technician", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="assigned_technician")
    assignments = relationship("WorkOrderAssignment", back_populates="technician")
    service_reports = relationship("ServiceReport", back_populates="technician")

class TechnicianSkill(Base):
    __tablename__ = "technician_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False, index=True)
    proficiency_level = Column(String(50), nullable=False, default="INTERMEDIATE") # BEGINNER, INTERMEDIATE, EXPERT
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    technician = relationship("Technician", back_populates="skills")

class TechnicianAvailability(Base):
    __tablename__ = "technician_availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    type = Column(String(50), nullable=False, default=LeaveType.LEAVE.value)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    technician = relationship("Technician", back_populates="availabilities")
