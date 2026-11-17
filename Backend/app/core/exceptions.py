from typing import Optional, Any, Dict
from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message
        self.details = details

class BadRequestException(AppException):
    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, code=code, message=message, details=details)

class UnauthorizedException(AppException):
    def __init__(self, code: str = "UNAUTHORIZED", message: str = "Authentication credentials were not provided or are invalid."):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, code=code, message=message, headers={"WWW-Authenticate": "Bearer"})

class ForbiddenException(AppException):
    def __init__(self, code: str = "CUSTOMER_ACCESS_DENIED", message: str = "You do not have permission to perform this action."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code=code, message=message)

class NotFoundException(AppException):
    def __init__(self, code: str = "NOT_FOUND", message: str = "The requested resource was not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message)

class ConflictException(AppException):
    def __init__(self, code: str = "CONFLICT", message: str = "A conflict occurred with the current state of the resource.", details: Optional[Any] = None):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code=code, message=message, details=details)

class UnprocessableEntityException(AppException):
    def __init__(self, code: str = "UNPROCESSABLE_ENTITY", message: str = "The provided data failed semantic validation.", details: Optional[Any] = None):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, code=code, message=message, details=details)
