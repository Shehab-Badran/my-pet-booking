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

# --- Audit Log Schema ---
class BookingAuditLogResponse(BaseModel):
    id: int
    booking_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Booking Creation Request (Public Guest Grooming) ---
class BookingCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=6, max_length=30)
    booking_date: date
    start_time: time  # e.g. 13:00:00
    special_notes: Optional[str] = None
    service_id: Optional[int] = None

# --- Admin Manual Booking Creation Request (Phone / WhatsApp / Walk-in) ---
class AdminBookingCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=6, max_length=30)
    booking_date: date
    start_time: time
    special_notes: Optional[str] = None
    booking_source: Optional[str] = Field("phone", pattern="^(phone|whatsapp|walk-in|website)$")

# --- Admin Booking Edit Details ---
class BookingUpdateDetails(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    customer_phone: Optional[str] = Field(None, min_length=6, max_length=30)
    special_notes: Optional[str] = None

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
    cancellation_reason: Optional[str] = None
    booking_source: Optional[str] = "website"
    status: str
    final_invoice_amount: Optional[Decimal] = None
    payment_status: Optional[str] = "unpaid"
    payment_date: Optional[date] = None
    invoice_notes: Optional[str] = None
    service_name_display: Optional[str] = "Grooming Appointment"
    created_at: datetime
    updated_at: Optional[datetime] = None
    audit_logs: Optional[List[BookingAuditLogResponse]] = []

    class Config:
        from_attributes = True

# --- Booking Status / Reschedule / Block ---
class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|completed|cancelled|no-show|blocked)$")
    reason: Optional[str] = None
    final_invoice_amount: Optional[Decimal] = None
    payment_status: Optional[str] = None
    payment_date: Optional[date] = None
    invoice_notes: Optional[str] = None

class BookingInvoiceUpdate(BaseModel):
    final_invoice_amount: Decimal = Field(..., ge=0)
    payment_status: str = Field("paid", pattern="^(paid|unpaid|refunded)$")
    payment_date: Optional[date] = None
    invoice_notes: Optional[str] = None

class BookingReschedule(BaseModel):
    booking_date: date
    start_time: time

class AdminBlockSlotRequest(BaseModel):
    booking_date: date
    start_time: time
    duration: Optional[int] = 60
    reason: Optional[str] = "Staff Maintenance / Slot Block"

# --- Availability Slot Response ---
class TimeSlot(BaseModel):
    time: time
    available: bool

# --- Friday Conflict Warning Schema ---
class FridayConflictBooking(BaseModel):
    id: int
    booking_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    booking_date: date
    start_time: time
    status: str

# --- Customer Appointment History & Loyalty ---
class CustomerHistoryResponse(BaseModel):
    phone: str
    name: Optional[str] = None
    total_appointments: int
    confirmed_appointments: int
    completed_appointments: int
    cancelled_appointments: int = 0
    no_show_appointments: int
    total_paid_revenue: Decimal = Decimal(0)
    loyalty_stamps: int = 0
    rewards_unlocked: int = 0
    rewards_redeemed: int = 0
    reward_available: bool = False
    reward_description: str = "Complimentary Grooming Add-on or Pampering Treatment"
    program_enabled: bool = True
    bookings: List[BookingResponse]

# --- My Pet Rewards Loyalty Schemas ---
class LoyaltyProgressResponse(BaseModel):
    phone: str
    customer_name: Optional[str] = None
    stamps_count: int
    total_lifetime_stamps: int
    rewards_unlocked: int
    rewards_redeemed: int
    reward_available: bool
    reward_description: str
    program_enabled: bool

class LoyaltyRedeemRequest(BaseModel):
    phone: str
    notes: Optional[str] = None

class LoyaltyRedeemResponse(BaseModel):
    success: bool
    message: str
    phone: str
    rewards_unlocked: int
    rewards_redeemed: int

# --- Simplified Admin Customer List Item ---
class CustomerListItem(BaseModel):
    phone: str
    name: str
    completed_visits: int
    last_appointment_date: Optional[date] = None
    loyalty_stamps: int
    rewards_unlocked: int
    reward_available: bool

# --- Revenue Report Schemas ---
class RevenueReportItem(BaseModel):
    id: int
    booking_id: str
    customer_name: str
    customer_phone: str
    booking_date: date
    payment_date: Optional[date] = None
    booking_source: str
    status: str
    payment_status: str
    final_invoice_amount: Decimal
    invoice_notes: Optional[str] = None

class MonthlyRevenueReport(BaseModel):
    year: int
    month: int
    month_name: str
    total_website_bookings: int
    completed_website_bookings: int
    paid_website_invoices_count: int
    total_website_revenue: Decimal
    unpaid_website_bookings_count: int
    average_website_invoice_value: Decimal
    total_manual_bookings: int
    completed_manual_bookings: int
    paid_manual_invoices_count: int
    total_manual_revenue: Decimal
    grand_total_revenue: Decimal
    items: List[RevenueReportItem]

# --- Telegram Test Schema ---
class TelegramTestRequest(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    message: Optional[str] = None

# --- Dashboard Statistics ---
class DashboardStats(BaseModel):
    today_total: int            # All customer appointments scheduled today (confirmed + completed + no-show + cancelled)
    today_confirmed: int        # Active confirmed appointments today
    today_completed: int        # Completed appointments today
    today_cancelled: int = 0    # Cancelled appointments today
    today_no_show: int          # No-show / phone-cancelled appointments today
    today_blocked: int          # Blocked periods today (excluded from customer total)
    upcoming_confirmed: int     # Future confirmed appointments
    total_bookings: int = 0     # All-time customer bookings
    total_completed: int = 0    # All-time completed
    total_cancelled: int = 0    # All-time cancelled
    total_no_show: int = 0      # All-time no-show
    total_revenue_collected: Decimal = Decimal(0)
    recent_bookings: List[BookingResponse]
    capacity_percentage: float  # Occupied slots vs total available schedule capacity
    capacity_explanation: str   # Human explanation of how capacity is calculated
    friday_conflicts_count: int # Existing Friday bookings starting before 3 PM
    friday_conflicts: List[FridayConflictBooking] = []

