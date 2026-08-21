"""Centralized application exceptions with stable error codes.

Every error surfaced to the client is translated to the JSON envelope
`{"success": false, "message": ..., "error_code": ...}` by the handlers
registered in ``app.main``. Stack traces and secrets are never leaked.
"""

from typing import Any, Dict, Optional


class AppError(Exception):
    """Base class for all application-level errors."""

    status_code: int = 400
    error_code: str = "APP_ERROR"
    default_message: str = "Request failed"

    def __init__(
        self,
        message: Optional[str] = None,
        error_code: Optional[str] = None,
        details: Optional[Any] = None,
        status_code: Optional[int] = None,
    ) -> None:
        self.message = message or self.default_message
        self.error_code = error_code or self.error_code
        self.details = details
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppError):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    default_message = "Validation failed"


class BadRequestError(AppError):
    status_code = 400
    error_code = "BAD_REQUEST"
    default_message = "Bad request"


class AuthenticationError(AppError):
    status_code = 401
    error_code = "UNAUTHORIZED"
    default_message = "Authentication required"


class InvalidTokenError(AuthenticationError):
    error_code = "INVALID_TOKEN"
    default_message = "Invalid or expired token"


class PermissionError(AppError):
    status_code = 403
    error_code = "FORBIDDEN"
    default_message = "You do not have permission to perform this action"


class NotFoundError(AppError):
    status_code = 404
    error_code = "NOT_FOUND"
    default_message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    error_code = "CONFLICT"
    default_message = "Resource already exists"


class InsufficientDataError(AppError):
    status_code = 422
    error_code = "INSUFFICIENT_DATA"
    default_message = "Not enough historical data to produce a reliable result"


class ServiceUnavailableError(AppError):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"
    default_message = "A required downstream service is unavailable"
