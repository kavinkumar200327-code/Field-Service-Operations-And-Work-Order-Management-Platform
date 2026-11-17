from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.api.deps import get_current_user, require_roles
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.models.service import Service, ServiceCategory
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceCategoryCreate,
    ServiceCategoryResponse,
    RequiredPartItem,
)
from app.schemas.base import APIResponse

router = APIRouter(prefix="/services", tags=["Service Catalog"])

ADMIN_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_MANAGER,
]

def map_service_to_response(svc: Service) -> ServiceResponse:
    parts_list = []
    if svc.required_parts:
        for p in svc.required_parts:
            parts_list.append(RequiredPartItem(
                part_sku=p.get('part_sku', ''),
                name=p.get('name', ''),
                quantity=p.get('quantity', 1)
            ))

    return ServiceResponse(
        id=svc.id,
        category_id=svc.category_id,
        category_name=svc.category.name if svc.category else None,
        name=svc.name,
        description=svc.description,
        estimated_duration=svc.estimated_duration,
        base_price=float(svc.base_price),
        required_skills=svc.required_skills or [],
        required_parts=parts_list,
        status=svc.status,
        created_at=svc.created_at,
        updated_at=svc.updated_at,
    )

@router.get("/categories", response_model=APIResponse[List[ServiceCategoryResponse]])
def list_categories(db: Session = Depends(get_db)) -> Any:
    cats = db.query(ServiceCategory).filter(ServiceCategory.is_active == True).order_by(ServiceCategory.name).all()
    data = [ServiceCategoryResponse.model_validate(c) for c in cats]
    return APIResponse(success=True, data=data)

@router.post("/categories", response_model=APIResponse[ServiceCategoryResponse], status_code=status.HTTP_201_CREATED)
def create_category(
    req: ServiceCategoryCreate,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    existing = db.query(ServiceCategory).filter(ServiceCategory.name.ilike(req.name)).first()
    if existing:
        raise ConflictException(code="CATEGORY_EXISTS", message="A category with this name already exists.")

    cat = ServiceCategory(
        name=req.name,
        description=req.description,
        is_active=req.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return APIResponse(success=True, message="Category created.", data=ServiceCategoryResponse.model_validate(cat))

@router.post("", response_model=APIResponse[ServiceResponse], status_code=status.HTTP_201_CREATED)
def create_service(
    req: ServiceCreate,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == req.category_id).first()
    if not cat:
        raise NotFoundException(code="CATEGORY_NOT_FOUND", message="Specified service category does not exist.")

    parts_dicts = [p.model_dump() for p in req.required_parts]

    svc = Service(
        category_id=req.category_id,
        name=req.name,
        description=req.description,
        estimated_duration=req.estimated_duration,
        base_price=req.base_price,
        required_skills=req.required_skills,
        required_parts=parts_dicts,
        status=req.status,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return APIResponse(success=True, message="Service created.", data=map_service_to_response(svc))

@router.get("", response_model=APIResponse[List[ServiceResponse]])
def list_services(
    category_id: Optional[UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Any:
    query = db.query(Service).join(ServiceCategory)

    if category_id:
        query = query.filter(Service.category_id == category_id)
    if status_filter:
        query = query.filter(Service.status == status_filter)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))

    services = query.order_by(Service.name).all()
    data = [map_service_to_response(s) for s in services]
    return APIResponse(success=True, data=data)

@router.get("/{service_id}", response_model=APIResponse[ServiceResponse])
def get_service(service_id: UUID, db: Session = Depends(get_db)) -> Any:
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise NotFoundException(code="SERVICE_NOT_FOUND", message="Service not found.")
    return APIResponse(success=True, data=map_service_to_response(svc))

@router.patch("/{service_id}", response_model=APIResponse[ServiceResponse])
def update_service(
    service_id: UUID,
    req: ServiceUpdate,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise NotFoundException(code="SERVICE_NOT_FOUND", message="Service not found.")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "required_parts" and val is not None:
            svc.required_parts = [p.model_dump() if hasattr(p, 'model_dump') else p for p in val]
        elif val is not None:
            setattr(svc, field, val)

    db.commit()
    db.refresh(svc)
    return APIResponse(success=True, message="Service catalog updated.", data=map_service_to_response(svc))

@router.delete("/{service_id}", response_model=APIResponse[dict])
def delete_service(
    service_id: UUID,
    current_user: User = Depends(require_roles(ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> Any:
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise NotFoundException(code="SERVICE_NOT_FOUND", message="Service not found.")

    # Soft delete / mark inactive to preserve historical records
    svc.status = "INACTIVE"
    db.commit()
    return APIResponse(success=True, message="Service marked as inactive.", data={"id": str(service_id)})
