"""Business profile schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class BusinessUpdateRequest(BaseModel):
    business_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    business_type: Optional[str] = Field(default=None, max_length=80)
    industry: Optional[str] = Field(default=None, max_length=80)
    email: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    gstin: Optional[str] = Field(default=None, max_length=15)
    pan: Optional[str] = Field(default=None, max_length=10)
    address: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=80)
    pincode: Optional[str] = Field(default=None, max_length=10)
    website: Optional[str] = Field(default=None, max_length=200)
    founded_year: Optional[int] = Field(default=None, ge=1900, le=2100)
    employee_count: Optional[int] = Field(default=None, ge=0)
    annual_turnover: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, max_length=10)
    fiscal_year_start: Optional[str] = Field(default=None, max_length=5)
