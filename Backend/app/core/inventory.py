from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.inventory import Part, InventoryTransaction, WorkOrderPart
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import (
    PartStatus,
    InventoryTransactionType,
    NotificationType,
    UserRole,
)
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    BadRequestException,
)

def check_and_update_part_status(part: Part) -> PartStatus:
    if part.available_quantity <= 0:
        part.status = PartStatus.OUT_OF_STOCK.value
    elif part.available_quantity <= part.reorder_threshold:
        part.status = PartStatus.LOW_STOCK.value
    else:
        part.status = PartStatus.IN_STOCK.value
    return part.status

def trigger_low_stock_notification(db: Session, part: Part):
    if part.available_quantity <= part.reorder_threshold:
        # Notify admins and managers
        managers = db.query(User).filter(
            User.role.in_([UserRole.SUPER_ADMIN.value, UserRole.OPERATIONS_MANAGER.value, UserRole.DISPATCHER.value]),
            User.is_active == True,
        ).all()
        for mgr in managers:
            notif = Notification(
                user_id=mgr.id,
                title="Low Stock Alert",
                message=f"Part '{part.name}' (SKU: {part.sku}) has reached low stock: {part.available_quantity} remaining (Threshold: {part.reorder_threshold}).",
                type=NotificationType.LOW_STOCK_DETECTED.value,
                link_url=f"/parts",
            )
            db.add(notif)

def consume_part_for_work_order(
    db: Session,
    work_order_id: UUID,
    part_id: UUID,
    quantity: int,
    user_id: Optional[UUID] = None,
    action: str = "CONSUMED", # CONSUMED or RESERVED
) -> WorkOrderPart:
    if quantity <= 0:
        raise BadRequestException(code="INVALID_QUANTITY", message="Quantity must be greater than zero.")

    # Concurrency safe row-lock
    part = db.query(Part).filter(Part.id == part_id).with_for_update().first()
    if not part:
        raise NotFoundException(code="PART_NOT_FOUND", message="Part not found.")

    if part.status == PartStatus.DISCONTINUED.value:
        raise ConflictException(code="PART_DISCONTINUED", message="Part is discontinued and cannot be consumed.")

    if part.available_quantity < quantity:
        raise ConflictException(
            code="INSUFFICIENT_PARTS_STOCK",
            message=f"Insufficient stock for part '{part.name}'. Available: {part.available_quantity}, Requested: {quantity}.",
            details={
                "part_id": str(part.id),
                "sku": part.sku,
                "available": part.available_quantity,
                "requested": quantity,
            }
        )

    # Deduct stock
    part.available_quantity -= quantity
    if action == "RESERVED":
        part.reserved_quantity += quantity
    
    check_and_update_part_status(part)
    trigger_low_stock_notification(db, part)

    # Record inventory transaction
    txn_type = InventoryTransactionType.CONSUMED.value if action == "CONSUMED" else InventoryTransactionType.RESERVED.value
    txn = InventoryTransaction(
        part_id=part.id,
        work_order_id=work_order_id,
        transaction_type=txn_type,
        quantity=quantity,
        unit_cost=part.unit_cost,
        notes=f"Used for Work Order {work_order_id}",
        created_by_user_id=user_id,
    )
    db.add(txn)

    # Check if this part was already recorded for this work order
    wo_part = db.query(WorkOrderPart).filter(
        WorkOrderPart.work_order_id == work_order_id,
        WorkOrderPart.part_id == part_id,
    ).first()

    if wo_part:
        wo_part.quantity += quantity
        wo_part.status = action
    else:
        wo_part = WorkOrderPart(
            work_order_id=work_order_id,
            part_id=part_id,
            quantity=quantity,
            unit_price=part.unit_cost,
            status=action,
        )
        db.add(wo_part)

    return wo_part

def return_part_from_work_order(
    db: Session,
    work_order_id: UUID,
    part_id: UUID,
    quantity: int,
    user_id: Optional[UUID] = None,
    reason: Optional[str] = None,
) -> WorkOrderPart:
    if quantity <= 0:
        raise BadRequestException(code="INVALID_QUANTITY", message="Return quantity must be greater than zero.")

    wo_part = db.query(WorkOrderPart).filter(
        WorkOrderPart.work_order_id == work_order_id,
        WorkOrderPart.part_id == part_id,
    ).first()

    if not wo_part:
        raise NotFoundException(code="PART_NOT_ON_WORK_ORDER", message="This part was not issued to the specified work order.")

    if wo_part.quantity < quantity:
        raise BadRequestException(
            code="INVALID_RETURN_QUANTITY",
            message=f"Cannot return {quantity} items. Only {wo_part.quantity} were allocated to this work order."
        )

    # Lock part
    part = db.query(Part).filter(Part.id == part_id).with_for_update().first()
    if not part:
        raise NotFoundException(code="PART_NOT_FOUND", message="Part not found.")

    part.available_quantity += quantity
    check_and_update_part_status(part)

    wo_part.quantity -= quantity
    if wo_part.quantity == 0:
        wo_part.status = "RETURNED"

    # Transaction log
    txn = InventoryTransaction(
        part_id=part.id,
        work_order_id=work_order_id,
        transaction_type=InventoryTransactionType.RETURNED.value,
        quantity=quantity,
        unit_cost=part.unit_cost,
        notes=f"Returned from Work Order. Reason: {reason or 'Unused'}",
        created_by_user_id=user_id,
    )
    db.add(txn)

    return wo_part
