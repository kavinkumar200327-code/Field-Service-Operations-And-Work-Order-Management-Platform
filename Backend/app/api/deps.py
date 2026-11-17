from typing import Generator, Optional, List
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import SessionLocal
from app.config import settings
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User
from app.models.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException(code="INVALID_TOKEN", message="Could not validate credentials.")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(code="INVALID_TOKEN", message="Token missing subject.")
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise UnauthorizedException(code="INVALID_TOKEN", message="Invalid user ID format in token.")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise UnauthorizedException(code="USER_NOT_FOUND", message="User does not exist.")
    
    if not user.is_active:
        raise UnauthorizedException(code="USER_INACTIVE", message="User account is deactivated.")
    
    return user

def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        allowed_values = [r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles]
        if current_user.role not in allowed_values:
            raise ForbiddenException(
                code="FORBIDDEN_ROLE",
                message=f"Access denied. Required roles: {', '.join(allowed_values)}"
            )
        return current_user
    return role_checker

# Common role dependency shortcuts
def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPERATIONS_MANAGER.value]:
        raise ForbiddenException(code="ADMIN_REQUIRED", message="Administrative access required.")
    return user

def get_current_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in [
        UserRole.SUPER_ADMIN.value,
        UserRole.OPERATIONS_MANAGER.value,
        UserRole.DISPATCHER.value,
        UserRole.FIELD_TECHNICIAN.value,
    ]:
        raise ForbiddenException(code="STAFF_REQUIRED", message="Staff access required.")
    return user
