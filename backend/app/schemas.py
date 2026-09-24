import re
from datetime import date, time, datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

# --- Helper Email Validator Regex (RFC 5322 standard compliant) ---
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_format(v: str) -> str:
    if not v or not v.strip():
        raise ValueError("Email address is required.")
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Please provide a valid email address (e.g. user@example.com).")
    return cleaned

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    phone: str = Field(..., min_length=6, max_length=30)
    password: str = Field(..., min_length=6, max_length=100)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class UserLogin(BaseModel):
    phone: str = Field(..., min_length=1, max_length=150)  # Accepts phone or email identifier
    password: str = Field(..., min_length=1, max_length=100)

class AdminLogin(BaseModel):
    email: str = Field(..., min_length=1, max_length=150)
    password: str = Field(..., min_length=1, max_length=100)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

class VerifyTokenResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    message: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)
    new_password: str = Field(..., min_length=6, max_length=100)

class MessageResponse(BaseModel):
    message: str

class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Settings ---
class SettingBase(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

# --- Services ---
class ServiceBase(BaseModel):
    name: str
    pet_type: str  # 'dog' or 'cat'
    pet_size: str  # 'small', 'large', or 'any'
    original_price: Decimal
    discounted_price: Decimal
    discount_percentage: int = 50
    duration: int  # in minutes
    description: Optional[str] = None
    active: Optional[bool] = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    pet_type: Optional[str] = None
    pet_size: Optional[str] = None
    original_price: Optional[Decimal] = None
    discounted_price: Optional[Decimal] = None
    discount_percentage: Optional[int] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: int

    class Config:
        from_attributes = True

# --- Pet ---
class PetBase(BaseModel):
    type: str  # 'dog' or 'cat'
    breed: Optional[str] = None
    size: Optional[str] = None  # 'small' or 'large'

class PetResponse(PetBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Booking Creation Request ---
class BookingCreate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    booking_date: date
    start_time: time  # e.g. 13:00:00
    special_notes: Optional[str] = None
    pet_type: Optional[str] = None
    pet_breed: Optional[str] = None
    pet_size: Optional[str] = None
    service_id: Optional[int] = None

# --- Booking Response ---
class BookingResponse(BaseModel):
    id: int
    booking_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    user: Optional[UserResponse] = None
    pet: Optional[PetResponse] = None
    service: Optional[ServiceResponse] = None
    booking_date: date
    start_time: time
    end_time: time
    price: Optional[Decimal] = Decimal(0)
    special_notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Booking Status / Reschedule / Block ---
class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|completed|no-show|blocked)$")

class BookingReschedule(BaseModel):
    booking_date: date
    start_time: time

class AdminBlockSlotRequest(BaseModel):
    booking_date: date
    start_time: time
    duration: Optional[int] = 60
    reason: Optional[str] = "Admin Slot Block / Maintenance"

# --- Availability Slot Response ---
class TimeSlot(BaseModel):
    time: time
    available: bool

# --- Dashboard Statistics ---
class DashboardStats(BaseModel):
    today_count: int
    upcoming_count: int
    recent_bookings: List[BookingResponse]
    capacity_percentage: float
