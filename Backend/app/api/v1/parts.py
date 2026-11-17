from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.core.inventory import consume_part_for_work_order, return_part_from_work_order
from app.models.inventory import Part, WorkOrderPart, InventoryTransaction
from app.models.work_order import WorkOrder
from app.models.user import User
from app.models.enums import UserRole, PartStatus
from app.schemas.inventory import (
    PartCreate,
    PartUpdate,
    PartResponse,
    WorkOrderPartCreate,
    WorkOrderPartReturn,
    WorkOrderPartResponse,
)
from app.schemas.base import APIResponse

router = APIRouter(tags=["Parts & Inventory Management"])

STAFF_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
    UserRole.DISPATCHER,
    UserRole.FIELD_TECHNICIAN,
]

ADMIN_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
]

def map_wo_part_response(wop: WorkOrderPart) -> WorkOrderPartResponse:
    return WorkOrderPartResponse(
        id=wop.id,
        work_order_id=wop.work_order_id,
        part_id=wop.part_id,
        part_sku=wop.part.sku if wop.part else None,
        part_name=wop.part.name if wop.part else None,
        quantity=wop.quantity,
        unit_price=float(wop.unit_price),
        status=wop.status,
        created_at=wop.created_at,
        updated_at=wop.updated_at,
    )

@router.post("/parts", response_model=APIResponse[PartResponse], status_code=status.HTTP_201_CREATED)
def create_part(
    req: PartCreate,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    existing = db.query(Part).filter(Part.sku.ilike(req.sku.strip())).first()
    if existing:
        raise ConflictException(code="SKU_EXISTS", message=f"Part with SKU '{req.sku}' already exists.")

    part_status = PartStatus.IN_STOCK.value
    if req.available_quantity <= 0:
        part_status = PartStatus.OUT_OF_STOCK.value
    elif req.available_quantity <= req.reorder_threshold:
        part_status = PartStatus.LOW_STOCK.value

    part = Part(
        sku=req.sku.strip().upper(),
        name=req.name,
        description=req.description,
        available_quantity=req.available_quantity,
        reserved_quantity=0,
        unit_cost=req.unit_cost,
        reorder_threshold=req.reorder_threshold,
        status=part_status,
    )
    db.add(part)
    db.commit()
    db.refresh(part)

    return APIResponse(success=True, message="Part created in inventory.", data=PartResponse.model_validate(part))

@router.get("/parts", response_model=APIResponse[List[PartResponse]])
def list_parts(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    low_stock_only: Optional[bool] = False,
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(Part)

    if low_stock_only:
        query = query.filter(Part.available_quantity <= Part.reorder_threshold)
    if status_filter:
        query = query.filter(Part.status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Part.sku.ilike(s),
                Part.name.ilike(s),
                Part.description.ilike(s),
            )
        )

    parts = query.order_by(Part.name).all()
    data = [PartResponse.model_validate(p) for p in parts]
    return APIResponse(success=True, data=data)

@router.get("/parts/{part_id}", response_model=APIResponse[PartResponse])
def get_part(part_id: UUID, db: Session = Depends(get_db)) -> Any:
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise NotFoundException(code="PART_NOT_FOUND", message="Part not found.")
    return APIResponse(success=True, data=PartResponse.model_validate(part))

@router.patch("/parts/{part_id}", response_model=APIResponse[PartResponse])
def update_part(
    part_id: UUID,
    req: PartUpdate,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise NotFoundException(code="PART_NOT_FOUND", message="Part not found.")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if hasattr(val, 'value'):
                setattr(part, field, val.value)
            else:
                setattr(part, field, val)

    # Recalculate status
    if part.available_quantity <= 0:
        part.status = PartStatus.OUT_OF_STOCK.value
    elif part.available_quantity <= part.reorder_threshold:
        part.status = PartStatus.LOW_STOCK.value
    else:
        part.status = PartStatus.IN_STOCK.value

    db.commit()
    db.refresh(part)
    return APIResponse(success=True, message="Part updated.", data=PartResponse.model_validate(part))

@router.post("/work-orders/{work_order_id}/parts", response_model=APIResponse[WorkOrderPartResponse], status_code=status.HTTP_201_CREATED)
def record_work_order_part(
    work_order_id: UUID,
    req: WorkOrderPartCreate,
    current_user: User = Depends(require_roles(STAFF_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    # Concurrency safe stock consumption and logging
    wop = consume_part_for_work_order(
        db=db,
        work_order_id=work_order_id,
        part_id=req.part_id,
        quantity=req.quantity,
        user_id=current_user.id,
        action=req.action,
    )
    db.commit()
    db.refresh(wop)

    return APIResponse(success=True, message="Part allocated to work order.", data=map_wo_part_response(wop))

@router.get("/work-orders/{work_order_id}/parts", response_model=APIResponse[List[WorkOrderPartResponse]])
def get_work_order_parts(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    parts = db.query(WorkOrderPart).filter(WorkOrderPart.work_order_id == work_order_id).all()
    data = [map_wo_part_response(p) for p in parts]
    return APIResponse(success=True, data=data)

@router.post("/work-orders/{work_order_id}/parts/{part_id}/return", response_model=APIResponse[WorkOrderPartResponse])
def return_work_order_part(
    work_order_id: UUID,
    part_id: UUID,
    req: WorkOrderPartReturn,
    current_user: User = Depends(require_roles(STAFF_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    wop = return_part_from_work_order(
        db=db,
        work_order_id=work_order_id,
        part_id=part_id,
        quantity=req.quantity,
        user_id=current_user.id,
        reason=req.reason,
    )
    db.commit()
    db.refresh(wop)

    return APIResponse(success=True, message="Part returned to inventory.", data=map_wo_part_response(wop))
