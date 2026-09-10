import os
from datetime import date, datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.database import engine, Base, get_db
from backend.app import crud, schemas, models
from backend.app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)

from sqlalchemy import text

# Auto-create database tables on startup
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="My Pet Center Grooming Booking API",
    description="Production-ready grooming booking API for My Pet Center.",
    version="2.0.0"
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
    """Register a new customer account."""
    existing_user = crud.get_user_by_phone(db, user_in.phone)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone number already exists. Please log in."
        )
    
    hashed_pwd = hash_password(user_in.password)
    user = crud.create_user(
        db,
        name=user_in.name,
        phone=user_in.phone,
        password_hash=hashed_pwd,
        role="customer",
        email=user_in.email
    )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
    )

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate customer (or admin) with phone/email and return JWT token."""
    user = crud.get_user_by_identifier(db, login_in.phone)
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone/email or password. Please try again."
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
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
        user=schemas.UserResponse.from_orm(user)
    )

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Fetch current logged-in user profile."""
    return current_user


# --- PUBLIC ENDPOINTS ---

@app.get("/services", response_model=List[schemas.ServiceResponse])
def read_services(db: Session = Depends(get_db)):
    """Fetch all active grooming services and 50% discount promotional pricing."""
    return crud.get_services(db, active_only=True)

@app.get("/availability", response_model=List[schemas.TimeSlot])
def get_availability(
    booking_date: date = Query(..., description="The booking date (YYYY-MM-DD)"),
    service_id: Optional[int] = Query(None, description="The service ID to query (optional)"),
    db: Session = Depends(get_db)
):
    """Get live 30-minute slot availability for a date within 3:00 PM – 12:00 AM (max 2 simultaneous appointments)."""
    return crud.get_available_slots(db, booking_date, service_id)

@app.get("/bookings/{booking_id}", response_model=schemas.BookingResponse)
def get_booking_by_id(booking_id: str, db: Session = Depends(get_db)):
    """Retrieve details of a booking using the public Booking ID (e.g. MPC-000123)."""
    db_booking = db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return db_booking


# --- CUSTOMER AUTHENTICATED ENDPOINTS ---

@app.post("/bookings", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemas.BookingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new grooming booking for the logged-in customer."""
    try:
        db_booking = crud.create_booking(db, user=current_user, booking_in=booking)
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
    """Get dashboard stats including counts and capacity percentage."""
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
    """Update a business setting configuration."""
    if key in ["opening_time", "closing_time"]:
        try:
            datetime.strptime(setting_update.value, "%H:%M:%S")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS (e.g. 15:00:00).")
    elif key == "max_simultaneous_bookings":
        if not setting_update.value.isdigit() or int(setting_update.value) <= 0:
            raise HTTPException(status_code=400, detail="Capacity must be a positive integer.")
    elif key == "max_booking_days_ahead":
        if not setting_update.value.isdigit() or int(setting_update.value) <= 0:
            raise HTTPException(status_code=400, detail="Booking window days must be a positive integer.")

    db_setting = crud.update_setting(db, key, setting_update.value)
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

