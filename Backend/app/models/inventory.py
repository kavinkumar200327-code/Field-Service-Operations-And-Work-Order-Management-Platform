import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import PartStatus, InventoryTransactionType

def get_utc_now():
    return datetime.now(timezone.utc)

class Part(Base):
    __tablename__ = "parts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    available_quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Numeric(10, 2), nullable=False, default=0.00)
    reorder_threshold = Column(Integer, nullable=False, default=5)
    status = Column(String(50), nullable=False, default=PartStatus.IN_STOCK.value, index=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint('available_quantity >= 0', name='check_available_quantity_non_negative'),
        CheckConstraint('reserved_quantity >= 0', name='check_reserved_quantity_non_negative'),
    )

    transactions = relationship("InventoryTransaction", back_populates="part", cascade="all, delete-orphan")
    work_order_parts = relationship("WorkOrderPart", back_populates="part")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_id = Column(UUID(as_uuid=True), ForeignKey("parts.id", ondelete="CASCADE"), nullable=False, index=True)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_type = Column(String(50), nullable=False) # PURCHASE, RESERVED, CONSUMED, RETURNED, ADJUSTMENT
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False, default=0.00)
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    part = relationship("Part", back_populates="transactions")
    work_order = relationship("WorkOrder")
    created_by = relationship("User")

class WorkOrderPart(Base):
    __tablename__ = "work_order_parts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    part_id = Column(UUID(as_uuid=True), ForeignKey("parts.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    status = Column(String(50), nullable=False, default="CONSUMED") # RESERVED, CONSUMED, RETURNED
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    work_order = relationship("WorkOrder", back_populates="parts_consumed")
    part = relationship("Part", back_populates="work_order_parts")
