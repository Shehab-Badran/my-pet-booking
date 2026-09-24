import os
from datetime import date, datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database import engine, Base, get_db
from backend.app import crud, schemas, models, email as email_service
from backend.app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse

# Auto-create and migrate database tables on startup
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    for col, col_type in [("customer_name", "VARCHAR"), ("customer_phone", "VARCHAR")]:
        try:
            conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {col} {col_type}"))
            conn.commit()
        except Exception:
            pass
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="My Pet Center Grooming Booking API",
    description="Production-ready grooming booking API for My Pet Center.",
    version="2.1.0"
)

# Custom Exception Handler to eliminate technical schema messages (e.g. "String should have at least 3 characters")
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = exc.errors()
    user_friendly_messages = []

    for err in errors:
        loc = err.get("loc", [])
        field = loc[-1] if loc else "field"
        err_type = err.get("type", "")

        if field == "name":
            user_friendly_messages.append("Please enter your full name.")
        elif field == "email":
            user_friendly_messages.append("Please enter a valid email address.")
        elif field == "phone":
            user_friendly_messages.append("Please enter a valid Egyptian phone number or email address.")
        elif field in ["password", "new_password"]:
            user_friendly_messages.append("Password must be at least 6 characters.")
        elif field == "token":
            user_friendly_messages.append("Password reset token is invalid or expired.")
        elif field == "booking_date":
            user_friendly_messages.append("Please select a valid appointment date.")
        elif field == "start_time":
            user_friendly_messages.append("Please select a valid appointment time.")
        elif "missing" in err_type:
            user_friendly_messages.append("This field is required.")
        else:
            msg = err.get("msg", "Invalid input.")
            if "string should have at least" in msg.lower():
                user_friendly_messages.append(f"Please check your input for {field}.")
            else:
                user_friendly_messages.append(msg)

    # Deduplicate messages while preserving order
    clean_detail = " ".join(dict.fromkeys(user_friendly_messages)) or "Invalid input provided. Please check your details."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": clean_detail}
    )

# Security Response Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ENDPOINTS ---

@app.post("/auth/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new customer account with validated Full Name, Email, Phone, and Password."""
    # Check phone uniqueness
    existing_phone = crud.get_user_by_phone(db, user_in.phone)
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone number already exists. Please log in."
        )

    # Check email uniqueness
    existing_email = crud.get_user_by_email(db, user_in.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    hashed_pwd = hash_password(user_in.password)
    user = crud.create_user(
        db,
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        password_hash=hashed_pwd,
        role="customer"
    )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user)
    )

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate customer (or admin) with phone/email identifier and password."""
    identifier = login_in.phone.strip()
    user = crud.get_user_by_identifier(db, identifier)
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone/email or password. Please try again."
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user)
    )

@app.post("/auth/admin-login", response_model=schemas.TokenResponse)
def admin_login(login_in: schemas.AdminLogin, db: Session = Depends(get_db)):
    """Dedicated private Admin login endpoint. Strictly verifies admin permissions."""
    user = crud.get_user_by_identifier(db, login_in.email)
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials. Please try again."
        )

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Administrator permissions required."
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user)
    )

@app.post("/auth/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate secure password reset.
    Generates a 15-minute one-time reset token and sends an email if the account exists.
    Returns an anti-enumeration generic response.
    """
    user = crud.get_user_by_email(db, req.email)
    if user:
        raw_token = crud.create_password_reset_token(db, user, expires_minutes=15)
        # Dispatch email (silently logs if SMTP not configured)
        email_service.send_password_reset_email(
            to_email=user.email,
            recipient_name=user.name,
            reset_token=raw_token
        )

    # Always return anti-enumeration generic message
    return schemas.MessageResponse(
        message="If this email is registered in our system, you will receive password reset instructions shortly."
    )

@app.get("/auth/verify-reset-token", response_model=schemas.VerifyTokenResponse)
def verify_reset_token(token: str = Query(..., min_length=10), db: Session = Depends(get_db)):
    """Verify if a password reset token is active, unused, and unexpired."""
    user = crud.verify_password_reset_token(db, token)
    if not user:
        return schemas.VerifyTokenResponse(
            valid=False,
            email=None,
            message="This password reset link is invalid or has expired. Please request a new one."
        )

    # Mask email for privacy (e.g. a***d@example.com)
    if user.email and "@" in user.email:
        local, domain = user.email.split("@", 1)
        if len(local) > 2:
            masked_local = local[0] + "***" + local[-1]
        else:
            masked_local = local[0] + "***"
        masked_email = f"{masked_local}@{domain}"
    else:
        masked_email = None

    return schemas.VerifyTokenResponse(
        valid=True,
        email=masked_email,
        message="Token is valid."
    )

@app.post("/auth/reset-password", response_model=schemas.MessageResponse)
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Complete secure password reset with a valid token."""
    try:
        crud.reset_password_with_token(db, req.token, req.new_password)
        return schemas.MessageResponse(
            message="Your password has been successfully reset. You can now log in with your new password."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Fetch current logged-in user profile."""
    return current_user


# --- PUBLIC BOOKING ENDPOINTS ---

@app.get("/services", response_model=List[schemas.ServiceResponse])
def read_services(db: Session = Depends(get_db)):
    """Fetch active grooming services."""
    return crud.get_services(db, active_only=True)

@app.get("/availability", response_model=List[schemas.TimeSlot])
def get_availability(
    booking_date: date = Query(..., description="The booking date (YYYY-MM-DD)"),
    service_id: Optional[int] = Query(None, description="The service ID to query (optional)"),
    db: Session = Depends(get_db)
):
    """Get live whole-hour slot availability for a date within operating hours (dynamic internal capacity)."""
    return crud.get_available_slots(db, booking_date, service_id)

@app.get("/bookings/{booking_id}", response_model=schemas.BookingResponse)
def get_booking_by_id(booking_id: str, db: Session = Depends(get_db)):
    """Retrieve details of a booking using the public Booking ID (e.g. MPC-000123)."""
    db_booking = db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return db_booking


# --- PUBLIC BOOKING CREATION ENDPOINT ---

@app.post("/bookings", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db)
):
    """Create a new grooming booking directly as a guest without login."""
    try:
        db_booking = crud.create_booking(db, booking_in=booking)
        return db_booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/bookings/my/all", response_model=List[schemas.BookingResponse])
def get_my_bookings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all upcoming and previous bookings for the logged-in customer."""
    return crud.get_user_bookings(db, user_id=current_user.id)


# --- ADMIN PROTECTED ENDPOINTS ---

@app.get("/admin/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard stats including counts and dynamic capacity percentage."""
    return crud.get_dashboard_stats(db)

@app.get("/admin/bookings", response_model=List[schemas.BookingResponse])
def read_admin_bookings(
    customer_name: Optional[str] = Query(None, description="Search by customer name"),
    phone: Optional[str] = Query(None, description="Search by phone number"),
    booking_date: Optional[date] = Query(None, description="Filter by booking date"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """View and search through bookings (Staff only)."""
    return crud.get_bookings(
        db,
        customer_name=customer_name,
        phone=phone,
        booking_date=booking_date,
        status=status_filter
    )

@app.patch("/admin/bookings/{booking_id_num}", response_model=schemas.BookingResponse)
def update_admin_booking_status(
    booking_id_num: int,
    status_update: schemas.BookingStatusUpdate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update booking status (confirmed, completed, no-show)."""
    db_booking = crud.update_booking_status(db, booking_id_num, status_update.status)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return db_booking

@app.post("/admin/bookings/{booking_id_num}/reschedule", response_model=schemas.BookingResponse)
def reschedule_admin_booking(
    booking_id_num: int,
    reschedule_in: schemas.BookingReschedule,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reschedule an existing booking to a new date/time."""
    try:
        return crud.reschedule_booking(
            db,
            booking_id=booking_id_num,
            new_date=reschedule_in.booking_date,
            new_start_time=reschedule_in.start_time
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/admin/block-slot", response_model=schemas.BookingResponse)
def block_slot(
    block_in: schemas.AdminBlockSlotRequest,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Block a grooming time slot for staff maintenance or internal scheduling control."""
    try:
        return crud.block_admin_slot(
            db,
            admin_user=admin_user,
            booking_date=block_in.booking_date,
            start_time=block_in.start_time,
            duration=block_in.duration or 60,
            reason=block_in.reason or "Admin Slot Block / Maintenance"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/admin/services", response_model=List[schemas.ServiceResponse])
def read_admin_services(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetch all services (active and inactive) for administration."""
    return crud.get_services(db, active_only=False)

@app.post("/admin/services", response_model=schemas.ServiceResponse)
def create_admin_service(
    service: schemas.ServiceCreate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new service configuration."""
    return crud.create_service(db, service)

@app.patch("/admin/services/{service_id}", response_model=schemas.ServiceResponse)
def update_admin_service(
    service_id: int,
    service_update: schemas.ServiceUpdate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update an existing service configuration."""
    db_service = crud.update_service(db, service_id, service_update)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found.")
    return db_service

@app.get("/settings", response_model=List[schemas.SettingBase])
def read_public_settings(db: Session = Depends(get_db)):
    """Fetch public schedule settings (operating hours, working days, booking window)."""
    return crud.get_settings(db)

@app.get("/admin/settings", response_model=List[schemas.SettingBase])
def read_admin_settings(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetch all business settings configurations."""
    return crud.get_settings(db)

@app.patch("/admin/settings/{key}", response_model=schemas.SettingBase)
def update_admin_setting(
    key: str,
    setting_update: schemas.SettingUpdate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a business setting configuration with strict validation and database persistence."""
    val = setting_update.value.strip()
    if not val:
        raise HTTPException(status_code=400, detail="Setting value cannot be empty.")

    if key in ["opening_time", "closing_time"]:
        try:
            datetime.strptime(val, "%H:%M:%S")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS (e.g. 13:00:00 or 00:00:00).")
    elif key == "max_simultaneous_bookings":
        if not val.isdigit() or int(val) <= 0:
            raise HTTPException(status_code=400, detail="Capacity must be a positive integer (e.g. 1, 2, 3).")
    elif key == "max_booking_days_ahead":
        if not val.isdigit() or int(val) <= 0:
            raise HTTPException(status_code=400, detail="Booking window days must be a positive integer (e.g. 5).")
    elif key == "slot_interval_minutes":
        if not val.isdigit() or int(val) <= 0:
            raise HTTPException(status_code=400, detail="Slot interval must be a positive integer in minutes (e.g. 60).")
    elif key == "working_days":
        if len(val) < 2:
            raise HTTPException(status_code=400, detail="Working days description must be at least 2 characters.")

    db_setting = crud.update_setting(db, key, val)
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting configuration key not found.")
    return db_setting


# --- STATIC PRODUCTION FRONTEND SERVING & SPA ROUTING ---
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_spa_root():
        """Serve homepage index.html at root."""
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "My Pet Center API is running."}

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        """Serve frontend static files and handle SPA fallback for client routes."""
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "My Pet Center API is running."}
