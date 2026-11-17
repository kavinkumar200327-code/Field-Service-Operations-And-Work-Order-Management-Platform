from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.enums import UserRole, CustomerType

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: Optional[UserRole] = UserRole.CUSTOMER
    
    # Optional customer auto-profile details on registration
    customer_type: Optional[CustomerType] = CustomerType.INDIVIDUAL
    address: Optional[str] = None
    service_location: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
