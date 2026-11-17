import os
import shutil
from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.config import settings
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.core.pdf_generator import generate_service_report_pdf
from app.models.service_report import ServiceReport, ReportAttachment
from app.models.work_order import WorkOrder
from app.models.technician import Technician
from app.models.user import User
from app.models.enums import UserRole, WorkOrderStatus
from app.schemas.service_report import (
    ServiceReportCreate,
    ServiceReportResponse,
    ReportAttachmentResponse,
)
from app.schemas.base import APIResponse

router = APIRouter(tags=["Service Reports"])

def map_report_to_response(r: ServiceReport) -> ServiceReportResponse:
    attachments = [
        ReportAttachmentResponse.model_validate(a)
        for a in r.attachments
    ]
    return ServiceReportResponse(
        id=r.id,
        work_order_id=r.work_order_id,
        work_order_number=r.work_order.work_order_number if r.work_order else None,
        technician_id=r.technician_id,
        technician_name=r.technician.user.full_name if r.technician and r.technician.user else "Technician",
        work_summary=r.work_summary,
        diagnosis=r.diagnosis,
        actions_performed=r.actions_performed,
        parts_used=r.parts_used or [],
        start_time=r.start_time,
        completion_time=r.completion_time,
        customer_remarks=r.customer_remarks,
        recommendations=r.recommendations,
        attachments=attachments,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )

@router.post("/work-orders/{work_order_id}/reports", response_model=APIResponse[ServiceReportResponse], status_code=status.HTTP_201_CREATED)
def create_service_report(
    work_order_id: UUID,
    req: ServiceReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    # Permissions: technician assigned or staff
    if current_user.role == UserRole.FIELD_TECHNICIAN.value:
        if not wo.assigned_technician or wo.assigned_technician.user_id != current_user.id:
            raise ForbiddenException(code="ACCESS_DENIED", message="Only the assigned technician can submit the report.")

    existing_report = db.query(ServiceReport).filter(ServiceReport.work_order_id == work_order_id).first()
    if existing_report:
        raise ConflictException(code="REPORT_ALREADY_EXISTS", message="A service report has already been created for this work order.")

    technician_id = wo.assigned_technician_id
    if not technician_id:
        tech = db.query(Technician).filter(Technician.user_id == current_user.id).first()
        technician_id = tech.id if tech else None

    if not technician_id:
        raise BadRequestException(code="NO_TECHNICIAN", message="Work order must have an assigned technician to file report.")

    report = ServiceReport(
        work_order_id=wo.id,
        technician_id=technician_id,
        work_summary=req.work_summary,
        diagnosis=req.diagnosis,
        actions_performed=req.actions_performed,
        parts_used=req.parts_used or [
            {
                "sku": p.part.sku if p.part else "N/A",
                "name": p.part.name if p.part else "Part",
                "quantity": p.quantity,
                "unit_price": float(p.unit_price)
            } for p in wo.parts_consumed
        ],
        start_time=req.start_time,
        completion_time=req.completion_time,
        customer_remarks=req.customer_remarks,
        recommendations=req.recommendations,
    )
    db.add(report)

    # If work order is not completed yet, mark it completed
    if wo.status != WorkOrderStatus.COMPLETED.value:
        wo.status = WorkOrderStatus.COMPLETED.value
        wo.actual_end = req.completion_time

    db.commit()
    db.refresh(report)

    return APIResponse(success=True, message="Service report created.", data=map_report_to_response(report))

@router.get("/work-orders/{work_order_id}/reports", response_model=APIResponse[Optional[ServiceReportResponse]])
def get_work_order_report(
    work_order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise NotFoundException(code="WORK_ORDER_NOT_FOUND", message="Work order not found.")

    if current_user.role == UserRole.CUSTOMER.value and wo.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")

    report = db.query(ServiceReport).filter(ServiceReport.work_order_id == work_order_id).first()
    if not report:
        return APIResponse(success=True, data=None, message="No report generated yet.")

    return APIResponse(success=True, data=map_report_to_response(report))

@router.get("/reports/{report_id}", response_model=APIResponse[ServiceReportResponse])
def get_report_by_id(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    report = db.query(ServiceReport).filter(ServiceReport.id == report_id).first()
    if not report:
        raise NotFoundException(code="REPORT_NOT_FOUND", message="Service report not found.")

    wo = report.work_order
    if current_user.role == UserRole.CUSTOMER.value and wo.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")

    return APIResponse(success=True, data=map_report_to_response(report))

@router.get("/reports/{report_id}/download")
def download_service_report_pdf(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(ServiceReport).filter(ServiceReport.id == report_id).first()
    if not report:
        raise NotFoundException(code="REPORT_NOT_FOUND", message="Service report not found.")

    wo = report.work_order
    if current_user.role == UserRole.CUSTOMER.value and wo.customer.user_id != current_user.id:
        raise ForbiddenException(code="CUSTOMER_ACCESS_DENIED", message="Access denied.")

    pdf_buffer = generate_service_report_pdf(
        report=report,
        work_order=wo,
        technician=report.technician,
        customer=wo.customer,
        parts_consumed=wo.parts_consumed,
    )

    filename = f"Service_Report_{wo.work_order_number}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/reports/{report_id}/attachments", response_model=APIResponse[ReportAttachmentResponse], status_code=status.HTTP_201_CREATED)
def upload_report_attachment(
    report_id: UUID,
    file: UploadFile = File(...),
    attachment_type: str = Form("DOCUMENT"), # BEFORE_PHOTO, AFTER_PHOTO, DOCUMENT
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    report = db.query(ServiceReport).filter(ServiceReport.id == report_id).first()
    if not report:
        raise NotFoundException(code="REPORT_NOT_FOUND", message="Service report not found.")

    # Validation: File size & extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise BadRequestException(
            code="INVALID_FILE_TYPE",
            message=f"File extension '.{ext}' is not permitted. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    file_bytes = file.file.read()
    file_size = len(file_bytes)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise BadRequestException(
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Save to upload dir
    save_filename = f"{report.id}_{secrets.token_hex(4)}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, save_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    attachment = ReportAttachment(
        report_id=report.id,
        file_name=file.filename,
        file_path=f"/uploads/{save_filename}",
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        attachment_type=attachment_type,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return APIResponse(success=True, message="Attachment uploaded.", data=ReportAttachmentResponse.model_validate(attachment))
