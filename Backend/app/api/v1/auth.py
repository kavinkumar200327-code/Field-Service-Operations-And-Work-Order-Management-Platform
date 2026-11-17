from datetime import timedelta, datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
)
from app.models.user import User, RefreshToken
from app.models.customer import Customer
from app.models.technician import Technician
from app.models.enums import UserRole, CustomerType, CustomerStatus
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    TokenResponse,
)
from app.schemas.base import APIResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_utc_now():
    return datetime.now(timezone.utc)

@router.post("/register", response_model=APIResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> Any:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise ConflictException(code="USER_ALREADY_EXISTS", message="A user with this email address already exists.")

    user = User(
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=req.role.value if req.role else UserRole.CUSTOMER.value,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Automatically initialize role-specific profile
    if user.role == UserRole.CUSTOMER.value:
        customer = Customer(
            user_id=user.id,
            name=user.full_name,
            email=user.email,
            phone=user.phone or "N/A",
            address=req.address or "Standard Address",
            service_location=req.service_location or (req.address or "Standard Service Location"),
            customer_type=req.customer_type.value if req.customer_type else CustomerType.INDIVIDUAL.value,
            status=CustomerStatus.ACTIVE.value,
        )
        db.add(customer)
    elif user.role == UserRole.FIELD_TECHNICIAN.value:
        technician = Technician(
            user_id=user.id,
            assigned_region="Metro Area",
            work_start_time="08:00",
            work_end_time="17:00",
            working_days=[1, 2, 3, 4, 5],
            service_categories=["General Maintenance", "HVAC"],
        )
        db.add(technician)

    # Issue Tokens
    access_token = create_access_token(subject=str(user.id), role=user.role)
    raw_refresh = generate_refresh_token()
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=get_utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_record)
    db.commit()
    db.refresh(user)

    return APIResponse(
        success=True,
        message="Registration successful.",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
    )

@router.post("/login", response_model=APIResponse[TokenResponse])
def login(req: LoginRequest, db: Session = Depends(get_db)) -> Any:
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise UnauthorizedException(code="INVALID_CREDENTIALS", message="Invalid email or password.")

    if not user.is_active:
        raise UnauthorizedException(code="USER_INACTIVE", message="Account is deactivated. Please contact support.")

    access_token = create_access_token(subject=str(user.id), role=user.role)
    raw_refresh = generate_refresh_token()
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=get_utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_record)
    db.commit()

    return APIResponse(
        success=True,
        message="Login successful.",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
    )

@router.post("/refresh", response_model=APIResponse[TokenResponse])
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)) -> Any:
    hashed = hash_refresh_token(req.refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hashed,
        RefreshToken.revoked == False,
    ).first()

    if not token_record:
        raise UnauthorizedException(code="INVALID_REFRESH_TOKEN", message="Refresh token is invalid or revoked.")

    if token_record.expires_at < get_utc_now():
        token_record.revoked = True
        db.commit()
        raise UnauthorizedException(code="REFRESH_TOKEN_EXPIRED", message="Refresh token has expired.")

    # Refresh token rotation: Revoke current token and generate new pair
    token_record.revoked = True
    user = token_record.user
    if not user or not user.is_active:
        raise UnauthorizedException(code="USER_INACTIVE", message="User inactive or removed.")

    new_access_token = create_access_token(subject=str(user.id), role=user.role)
    new_raw_refresh = generate_refresh_token()
    new_refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(new_raw_refresh),
        expires_at=get_utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_refresh_record)
    db.commit()

    return APIResponse(
        success=True,
        message="Token refreshed successfully.",
        data=TokenResponse(
            access_token=new_access_token,
            refresh_token=new_raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
    )

@router.post("/logout", response_model=APIResponse[dict])
def logout(
    req: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    hashed = hash_refresh_token(req.refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hashed,
        RefreshToken.user_id == current_user.id
    ).first()

    if token_record:
        token_record.revoked = True
        db.commit()

    return APIResponse(
        success=True,
        message="Logged out successfully.",
        data={"revoked": True}
    )

@router.get("/me", response_model=APIResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return APIResponse(
        success=True,
        data=UserResponse.model_validate(current_user)
    )

@router.patch("/me", response_model=APIResponse[UserResponse])
@router.put("/me", response_model=APIResponse[UserResponse])
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise NotFoundException(code="USER_NOT_FOUND", message="User not found.")

    if req.email and req.email.lower() != user.email.lower():
        existing = db.query(User).filter(
            func.lower(User.email) == req.email.lower(),
            User.id != user.id
        ).first()
        if existing:
            raise ConflictException(code="EMAIL_ALREADY_REGISTERED", message="This email is already in use by another account.")
        user.email = req.email.lower()

    if req.full_name is not None and req.full_name.strip():
        user.full_name = req.full_name.strip()
        if user.customer_profile:
            user.customer_profile.name = user.full_name

    if req.phone is not None:
        user.phone = req.phone.strip() if req.phone.strip() else None
        if user.customer_profile:
            user.customer_profile.phone = user.phone
        if user.technician_profile:
            user.technician_profile.phone = user.phone

    db.commit()
    db.refresh(user)

    return APIResponse(
        success=True,
        message="Profile updated successfully.",
        data=UserResponse.model_validate(user)
    )

@router.post("/change-password", response_model=APIResponse[dict])
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise NotFoundException(code="USER_NOT_FOUND", message="User not found.")

    if not verify_password(req.current_password, user.password_hash):
        raise BadRequestException(code="INVALID_CURRENT_PASSWORD", message="Current password incorrect.")

    user.password_hash = get_password_hash(req.new_password)
    # Revoke existing refresh tokens
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()
    db.refresh(user)

    return APIResponse(
        success=True,
        message="Password updated successfully and saved permanently in the database.",
        data={"updated": True}
    )
