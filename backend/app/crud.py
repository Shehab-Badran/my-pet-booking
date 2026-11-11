import secrets
import hashlib
import threading
import re
from datetime import date, time, datetime, timedelta
from typing import List, Optional
from decimal import Decimal
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from backend.app import models, schemas
from backend.app.auth import hash_password

# Africa/Cairo Timezone for all business dates and times
CAIRO_TZ = ZoneInfo("Africa/Cairo")

def get_cairo_now() -> datetime:
    return datetime.now(CAIRO_TZ)

def get_cairo_today() -> date:
    return get_cairo_now().date()

# Global lock for SQLite local synchronization
sqlite_booking_lock = threading.Lock()

# --- Egyptian Mobile Phone Normalization & Validation ---
EGYPT_MOBILE_REGEX = re.compile(r"^01[0125][0-9]{8}$")

def normalize_phone_number(phone_str: str) -> str:
    """Normalize phone input (ASCII, Arabic digits, spaces, country codes)."""
    if not phone_str:
        return ""
    arabic_to_ascii = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    cleaned = str(phone_str).translate(arabic_to_ascii).strip()
    
    # Extract only digits
    cleaned = "".join([c for c in cleaned if c.isdigit()])
    
    # Handle Egypt country code 20 / 0020
    if cleaned.startswith("0020"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("20") and len(cleaned) >= 11:
        cleaned = cleaned[2:]
    
    # Ensure leading zero for Egyptian mobile operators (010, 011, 012, 015)
    if cleaned.startswith(("10", "11", "12", "15")) and len(cleaned) == 10:
        cleaned = "0" + cleaned

    return cleaned

def is_valid_egyptian_phone(phone_str: str) -> bool:
    normalized = normalize_phone_number(phone_str)
    return bool(EGYPT_MOBILE_REGEX.match(normalized))

# --- Settings Operations ---

def get_setting_value(db: Session, key: str, default: str) -> str:
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    return db_setting.value if db_setting else default

def get_settings(db: Session) -> List[models.Setting]:
    return db.query(models.Setting).all()

def update_setting(db: Session, key: str, value: str) -> Optional[models.Setting]:
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if db_setting:
        db_setting.value = value
        db.commit()
        db.refresh(db_setting)
    else:
        db_setting = models.Setting(key=key, value=value)
        db.add(db_setting)
        db.commit()
        db.refresh(db_setting)
    return db_setting

# --- Operating Hours & Schedule Rules ---

def _parse_time_str(val: str, default: time) -> time:
    if not val:
        return default
    val = str(val).strip()
    if val in ["00:00", "00:00:00", "24:00", "24:00:00"]:
        return time(0, 0)
    for fmt in ["%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"]:
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            pass
    return default

def get_special_dates_schedule(db: Session) -> dict:
    val = get_setting_value(db, "special_dates_schedule", "{}")
    try:
        import json
        return json.loads(val) if val else {}
    except Exception:
        return {}

def get_daily_operating_hours(db: Session, booking_date: date):
    """
    Store hours and grooming appointment start times:
    - Supports custom special dates and exceptional closed dates.
    - Default Friday: 3:00 PM – 11:00 PM start times.
    - Default Other days: 1:00 PM – 11:00 PM start times.
    - Closing time defaults to Midnight (00:00).
    """
    special_dates = get_special_dates_schedule(db)
    date_key = booking_date.strftime("%Y-%m-%d")
    is_friday = booking_date.weekday() == 4  # 4 is Friday in Python

    if date_key in special_dates:
        spec = special_dates[date_key]
        if spec.get("closed"):
            return None, None, is_friday
        if spec.get("opening_time") and spec.get("closing_time"):
            op = _parse_time_str(spec["opening_time"], time(13, 0))
            cl = _parse_time_str(spec["closing_time"], time(0, 0))
            return op, cl, is_friday

    if is_friday:
        opening_str = get_setting_value(db, "opening_time_friday", "15:00")
        op_def = time(15, 0)
    else:
        opening_str = get_setting_value(db, "opening_time", "12:00")
        op_def = time(12, 0)
    closing_str = get_setting_value(db, "closing_time", "23:00")

    opening_time = _parse_time_str(opening_str, op_def)
    closing_time = _parse_time_str(closing_str, time(23, 0))
    return opening_time, closing_time, is_friday

# --- Services Operations ---

def get_services(db: Session, active_only: bool = True) -> List[models.Service]:
    query = db.query(models.Service)
    if active_only:
        query = query.filter(models.Service.active == True)
    return query.order_by(models.Service.id.asc()).all()

def get_service_by_id(db: Session, service_id: int) -> Optional[models.Service]:
    return db.query(models.Service).filter(models.Service.id == service_id).first()

def create_service(db: Session, service: schemas.ServiceCreate) -> models.Service:
    db_service = models.Service(
        name=service.name,
        pet_type=service.pet_type,
        pet_size=service.pet_size,
        original_price=service.original_price,
        discounted_price=service.discounted_price,
        discount_percentage=service.discount_percentage,
        duration=service.duration,
        description=service.description,
        active=service.active if service.active is not None else True
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

def update_service(db: Session, service_id: int, service_update: schemas.ServiceUpdate) -> Optional[models.Service]:
    db_service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if db_service:
        update_data = service_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_service, key, value)
        db.commit()
        db.refresh(db_service)
    return db_service

# --- User & Auth Operations ---

def get_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    clean_phone = normalize_phone_number(phone)
    return db.query(models.User).filter(
        or_(
            models.User.phone == clean_phone,
            models.User.phone == phone.strip()
        )
    ).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    if not email:
        return None
    clean_email = email.strip().lower()
    return db.query(models.User).filter(models.User.email == clean_email).first()

def get_user_by_identifier(db: Session, identifier: str) -> Optional[models.User]:
    if not identifier:
        return None
    clean_id = str(identifier).strip()
    if not clean_id:
        return None

    if "@" in clean_id:
        return db.query(models.User).filter(models.User.email == clean_id.lower()).first()

    clean_phone = normalize_phone_number(clean_id)
    return db.query(models.User).filter(
        or_(
            models.User.phone == clean_phone,
            models.User.phone == clean_id,
            models.User.email == clean_id.lower()
        )
    ).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(
    db: Session,
    name: str,
    email: str,
    phone: str,
    password_hash: str,
    role: str = "customer"
) -> models.User:
    clean_phone = normalize_phone_number(phone) or phone.strip()
    clean_email = email.strip().lower()
    user = models.User(
        name=name.strip(),
        email=clean_email,
        phone=clean_phone,
        password_hash=password_hash,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# --- Password Reset Token Management ---

def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def create_password_reset_token(db: Session, user: models.User, expires_minutes: int = 15) -> str:
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False
    ).update({"used": True})
    db.commit()

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)

    db_token = models.PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        used=False
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return raw_token

def verify_password_reset_token(db: Session, raw_token: str) -> Optional[models.User]:
    if not raw_token or len(raw_token) < 10:
        return None
    token_hash = _hash_token(raw_token)
    now = datetime.utcnow()

    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > now
    ).first()

    if not token_record:
        return None
    return token_record.user

def reset_password_with_token(db: Session, raw_token: str, new_password: str) -> models.User:
    if not raw_token or len(raw_token) < 10:
        raise ValueError("Invalid or expired password reset token.")

    token_hash = _hash_token(raw_token)
    now = datetime.utcnow()

    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > now
    ).first()

    if not token_record:
        raise ValueError("This password reset link is invalid or has expired. Please request a new one.")

    user = token_record.user
    if not user:
        raise ValueError("Associated user account not found.")

    user.password_hash = hash_password(new_password)
    token_record.used = True

    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id
    ).update({"used": True})

    db.commit()
    db.refresh(user)
    return user

# --- Pet Operations ---

def get_or_create_pet(
    db: Session,
    user_id: int,
    pet_type: str = "pet",
    breed: Optional[str] = None,
    size: Optional[str] = None
) -> models.Pet:
    query = db.query(models.Pet).filter(
        models.Pet.user_id == user_id,
        models.Pet.type == pet_type
    )
    if breed:
        query = query.filter(models.Pet.breed == breed)
    if size:
        query = query.filter(models.Pet.size == size)
    
    pet = query.first()
    if not pet:
        pet = models.Pet(
            user_id=user_id,
            type=pet_type,
            breed=breed,
            size=size
        )
        db.add(pet)
        db.commit()
        db.refresh(pet)
    return pet

# --- Availability & Capacity Calculations ---

def check_overlap_capacity(
    db: Session,
    booking_date: date,
    start_time: time,
    end_time: time,
    max_capacity: int,
    ignore_booking_id: Optional[int] = None
) -> bool:
    """
    Check if slot has capacity.
    CRITICAL: Only 'confirmed', 'completed', and 'blocked' count towards occupied capacity!
    Marking a booking 'no-show' releases the slot immediately for new bookings.
    """
    s_min = start_time.hour * 60 + start_time.minute
    e_min = end_time.hour * 60 + end_time.minute
    if e_min <= s_min:
        e_min += 24 * 60

    # Excludes 'no-show' so cancelled/no-show slots become immediately free
    query = db.query(models.Booking).filter(
        models.Booking.booking_date == booking_date,
        models.Booking.status.in_(["confirmed", "completed", "blocked"])
    )
    if ignore_booking_id:
        query = query.filter(models.Booking.id != ignore_booking_id)
        
    bookings = query.all()

    intervals = []
    for b in bookings:
        b_s = b.start_time.hour * 60 + b.start_time.minute
        b_e = b.end_time.hour * 60 + b.end_time.minute
        if b_e <= b_s:
            b_e += 24 * 60
        intervals.append((b_s, b_e))

    event_times = [s_min, e_min]
    for b_s, b_e in intervals:
        if b_s < e_min and s_min < b_e:
            if s_min < b_s < e_min:
                event_times.append(b_s)
            if s_min < b_e < e_min:
                event_times.append(b_e)

    event_times = sorted(list(set(event_times)))

    for i in range(len(event_times) - 1):
        t1 = event_times[i]
        t2 = event_times[i+1]
        if t1 >= t2:
            continue
        
        count = 0
        for b_s, b_e in intervals:
            if b_s <= t1 and t2 <= b_e:
                count += 1
                
        if count >= max_capacity:
            return False

    return True

def get_available_slots(db: Session, booking_date: date, service_id: Optional[int] = None) -> List[schemas.TimeSlot]:
    """
    Generate live whole-hour slots for booking_date based on real weekly schedule:
    - Friday: 3:00 PM – 11:00 PM (15:00 to 23:00 start times). Never offers 1:00 PM or 2:00 PM.
    - Sat–Thu: 1:00 PM – 11:00 PM (13:00 to 23:00 start times).
    - 60-minute slots finishing by midnight.
    - All dates and past-slot filtering strictly calculated in Africa/Cairo time.
    """
    opening_time, closing_time, is_friday = get_daily_operating_hours(db, booking_date)
    if opening_time is None or closing_time is None:
        return []

    duration = int(get_setting_value(db, "slot_interval_minutes", "60"))
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "1"))
    max_days = int(get_setting_value(db, "max_booking_days_ahead", "5"))
    slot_interval = duration

    # Africa/Cairo current date & time
    today_cairo = get_cairo_today()
    max_date = today_cairo + timedelta(days=max_days - 1)
    now_cairo = get_cairo_now()
    current_time_min = now_cairo.hour * 60 + now_cairo.minute

    op_min = opening_time.hour * 60 + opening_time.minute
    cl_min = closing_time.hour * 60 + closing_time.minute
    if cl_min <= op_min:
        cl_min += 24 * 60  # Midnight = 1440 min

    slots = []
    current_min = op_min
    while current_min <= cl_min - duration:
        slot_hour = (current_min // 60) % 24
        slot_minute = current_min % 60
        slot_time = time(slot_hour, slot_minute)

        end_min = current_min + duration
        end_hour = (end_min // 60) % 24
        end_minute = end_min % 60
        end_time = time(end_hour, end_minute)

        # 1. Date is in the past or beyond allowed booking window
        if booking_date < today_cairo or booking_date > max_date:
            available = False
        # 2. Filter out past slots today in Cairo time
        elif booking_date == today_cairo and current_min <= current_time_min:
            available = False
        else:
            # 3. Check overlap capacity against active bookings
            available = check_overlap_capacity(db, booking_date, slot_time, end_time, max_cap)

        slots.append(schemas.TimeSlot(time=slot_time, available=available))
        current_min += slot_interval

    return slots

# --- Booking Creation (Public Guest & Admin Manual) ---

def create_booking(
    db: Session,
    booking_in: schemas.BookingCreate,
    booking_source: str = "website",
    created_by_user: Optional[models.User] = None
) -> models.Booking:
    """
    Create a grooming appointment.
    Follows strict business rules:
      - Egyptian phone normalization & validation.
      - Friday start times: 3:00 PM – 11:00 PM. Never allows 1:00 PM or 2:00 PM.
      - Other days: 1:00 PM – 11:00 PM.
      - 60-minute whole-hour slots.
      - Generic Grooming Appointment (does not silently assign 'Shower').
      - Concurrency safe & duplicate submission protection.
      - Does not silently overwrite old customer records.
      - Records creation in audit log.
    """
    is_sqlite = db.bind.dialect.name == "sqlite"
    
    if is_sqlite:
        sqlite_booking_lock.acquire()

    try:
        max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "1"))
        max_days = int(get_setting_value(db, "max_booking_days_ahead", "5"))
        slot_interval = int(get_setting_value(db, "slot_interval_minutes", "60"))

        if not is_sqlite:
            db.query(models.Setting).filter(models.Setting.key == "max_simultaneous_bookings").with_for_update().first()

        # 1. Customer Name Validation
        customer_name = (booking_in.name or "").strip()
        if not customer_name or len(customer_name) < 2:
            raise ValueError("Please enter your full name.")

        # 2. Egyptian Phone Validation & Normalization
        raw_phone = (booking_in.phone or "").strip()
        clean_phone = normalize_phone_number(raw_phone)
        if not clean_phone or not is_valid_egyptian_phone(clean_phone):
            raise ValueError("Please enter a valid Egyptian mobile number (e.g. 01012345678 or +201012345678).")

        # 3. Duplicate Booking Prevention (Same phone + date + time already active)
        existing_duplicate = db.query(models.Booking).filter(
            models.Booking.customer_phone == clean_phone,
            models.Booking.booking_date == booking_in.booking_date,
            models.Booking.start_time == booking_in.start_time,
            models.Booking.status.in_(["confirmed", "completed"])
        ).first()
        if existing_duplicate:
            raise ValueError(f"You already have an active appointment booked for this time ({existing_duplicate.booking_id}).")

        # 4. Strict whole-hour validation
        if booking_in.start_time.minute % slot_interval != 0:
            raise ValueError("Appointments must be booked on whole hours (e.g. 1:00 PM, 2:00 PM). Half-hour slots are not permitted.")

        # 5. Booking Window (Cairo time)
        today_cairo = get_cairo_today()
        max_date = today_cairo + timedelta(days=max_days - 1)
        if booking_in.booking_date < today_cairo or booking_in.booking_date > max_date:
            raise ValueError(f"Bookings are available up to {max_days} days in advance.")

        # 6. Operating Hours (Friday vs Other Days vs Special Dates)
        opening_time, closing_time, is_friday = get_daily_operating_hours(db, booking_in.booking_date)
        if opening_time is None or closing_time is None:
            raise ValueError("Our center is closed for appointments on this date.")

        duration = int(get_setting_value(db, "slot_interval_minutes", "60"))

        s_min = booking_in.start_time.hour * 60 + booking_in.start_time.minute
        e_min = s_min + duration

        op_min = opening_time.hour * 60 + opening_time.minute
        cl_min = closing_time.hour * 60 + closing_time.minute
        if cl_min <= op_min:
            cl_min += 24 * 60

        if s_min < op_min or e_min > cl_min:
            raise ValueError(f"Appointments on this date are available with start times between {opening_time.strftime('%I:%M %p')} and {closing_time.strftime('%I:%M %p')}.")

        # 7. Past slots check (Cairo time)
        now_cairo = get_cairo_now()
        if booking_in.booking_date == today_cairo and s_min <= (now_cairo.hour * 60 + now_cairo.minute):
            raise ValueError("Cannot book a time slot in the past.")

        # 8. Capacity validation
        end_hour = (e_min // 60) % 24
        end_minute = e_min % 60
        end_time = time(end_hour, end_minute)

        is_available = check_overlap_capacity(
            db,
            booking_in.booking_date,
            booking_in.start_time,
            end_time,
            max_cap
        )
        if not is_available:
            raise ValueError("This time slot is no longer available. Please choose another time.")

        # 9. User Association (without silently modifying existing customer records)
        user = get_user_by_phone(db, clean_phone)
        if not user:
            user = models.User(
                name=customer_name,
                phone=clean_phone,
                email=None,
                password_hash=hash_password(secrets.token_urlsafe(16)),
                role="customer"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        pet = get_or_create_pet(db, user_id=user.id, pet_type="pet")

        # 10. Service Handling:
        # DO NOT silently assign 'Shower'!
        # If genuine service_id provided, preserve it; otherwise leave None (generic Grooming Appointment).
        service = None
        if booking_in.service_id:
            service = get_service_by_id(db, booking_in.service_id)

        # 11. Unique Booking Reference ID (e.g. MPC-000123)
        max_id = db.query(models.Booking.id).order_by(models.Booking.id.desc()).first()
        base_num = (max_id[0] if max_id else 0) + 123
        booking_id = f"MPC-{base_num:06d}"
        while db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first():
            base_num += 1
            booking_id = f"MPC-{base_num:06d}"

        # 12. Create Booking
        db_booking = models.Booking(
            booking_id=booking_id,
            customer_name=customer_name,
            customer_phone=clean_phone,
            user_id=user.id,
            pet_id=pet.id,
            service_id=service.id if service else None,
            booking_date=booking_in.booking_date,
            start_time=booking_in.start_time,
            end_time=end_time,
            price=service.discounted_price if service else 0,
            special_notes=booking_in.special_notes.strip() if booking_in.special_notes else None,
            cancellation_reason=None,
            booking_source=booking_source,
            status="confirmed"
        )
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)

        # 13. Audit Log
        creator_name = created_by_user.name if created_by_user else "Customer (Online)"
        creator_id = created_by_user.id if created_by_user else user.id
        audit_log = models.BookingAuditLog(
            booking_id=db_booking.id,
            user_id=creator_id,
            user_name=creator_name,
            action="created",
            old_value=None,
            new_value=f"Created booking {booking_id} on {db_booking.booking_date} at {db_booking.start_time.strftime('%I:%M %p')} via {booking_source}",
            reason=None
        )
        db.add(audit_log)
        db.commit()
        db.refresh(db_booking)

        # Attach display name helper
        db_booking.service_name_display = service.name if service else "Grooming Appointment"

        # Dispatch Telegram notification for new booking
        try:
            from backend.app.telegram import notify_new_booking
            notify_new_booking(db_booking, db=db)
        except Exception:
            pass

        return db_booking

    finally:
        if is_sqlite:
            sqlite_booking_lock.release()

# --- Booking Retrieval & Filters ---

def enrich_booking_display(booking: models.Booking) -> models.Booking:
    """Helper to attach service_name_display without altering database record."""
    if booking.status == "blocked":
        booking.service_name_display = "Blocked Time"
    elif booking.service:
        booking.service_name_display = booking.service.name
    else:
        booking.service_name_display = "Grooming Appointment"
    return booking

def get_user_bookings(db: Session, user_id: int) -> List[models.Booking]:
    bookings = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service),
        joinedload(models.Booking.audit_logs)
    ).filter(
        models.Booking.user_id == user_id
    ).order_by(
        models.Booking.booking_date.desc(),
        models.Booking.start_time.desc()
    ).all()
    for b in bookings:
        enrich_booking_display(b)
    return bookings

def get_bookings(
    db: Session,
    customer_name: Optional[str] = None,
    phone: Optional[str] = None,
    booking_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 500
) -> List[models.Booking]:
    query = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service),
        joinedload(models.Booking.audit_logs)
    )

    if booking_date:
        query = query.filter(models.Booking.booking_date == booking_date)
    else:
        if start_date:
            query = query.filter(models.Booking.booking_date >= start_date)
        if end_date:
            query = query.filter(models.Booking.booking_date <= end_date)
        
    if status:
        query = query.filter(models.Booking.status == status)

    if customer_name:
        query = query.outerjoin(models.User).filter(
            or_(
                models.Booking.customer_name.ilike(f"%{customer_name}%"),
                models.User.name.ilike(f"%{customer_name}%")
            )
        )
        
    if phone:
        clean_phone = normalize_phone_number(phone) or phone.strip()
        query = query.outerjoin(models.User).filter(
            or_(
                models.Booking.customer_phone.contains(clean_phone),
                models.Booking.customer_phone.contains(phone.strip()),
                models.User.phone.contains(clean_phone),
                models.User.phone.contains(phone.strip())
            )
        )

    bookings = query.order_by(models.Booking.booking_date.desc(), models.Booking.start_time.asc()).limit(limit).all()
    for b in bookings:
        enrich_booking_display(b)
    return bookings

def get_customer_history(db: Session, phone: str) -> schemas.CustomerHistoryResponse:
    clean_phone = normalize_phone_number(phone) or phone.strip()
    query = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service),
        joinedload(models.Booking.audit_logs)
    ).filter(
        or_(
            models.Booking.customer_phone == clean_phone,
            models.Booking.customer_phone.contains(clean_phone)
        )
    ).order_by(models.Booking.booking_date.desc(), models.Booking.start_time.desc())

    bookings = query.all()
    for b in bookings:
        enrich_booking_display(b)

    name = bookings[0].customer_name if bookings else None
    total = len(bookings)
    confirmed = sum(1 for b in bookings if b.status == "confirmed")
    completed = sum(1 for b in bookings if b.status == "completed")
    cancelled = sum(1 for b in bookings if b.status == "cancelled")
    no_show = sum(1 for b in bookings if b.status == "no-show")

    # Sum total collected revenue
    total_paid = Decimal(0)
    for b in bookings:
        if b.payment_status == "paid" and b.final_invoice_amount:
            total_paid += Decimal(str(b.final_invoice_amount))

    # My Pet Rewards: 1 stamp per completed & paid website grooming appointment. 3 stamps = 1 reward.
    loyalty_enabled = get_setting_value(db, "loyalty_program_enabled", "true").lower() in ["true", "1", "yes"]
    reward_desc = get_setting_value(db, "loyalty_reward_description", "Complimentary Grooming Add-on or Pampering Treatment")

    eligible_website_visits = sum(
        1 for b in bookings
        if b.status == "completed"
        and b.payment_status == "paid"
        and (b.booking_source and b.booking_source.lower() == "website")
    )

    redeemed_count = db.query(models.CustomerRewardRedemption).filter(
        models.CustomerRewardRedemption.customer_phone == clean_phone
    ).count()

    rewards_unlocked = eligible_website_visits // 3
    reward_available = (rewards_unlocked > redeemed_count) and loyalty_enabled
    active_stamps = eligible_website_visits % 3

    return schemas.CustomerHistoryResponse(
        phone=clean_phone,
        name=name,
        total_appointments=total,
        confirmed_appointments=confirmed,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
        no_show_appointments=no_show,
        total_paid_revenue=total_paid,
        loyalty_stamps=active_stamps,
        rewards_unlocked=rewards_unlocked,
        rewards_redeemed=redeemed_count,
        reward_available=reward_available,
        reward_description=reward_desc,
        program_enabled=loyalty_enabled,
        bookings=bookings
    )

def redeem_customer_reward(db: Session, phone: str, staff_user: models.User, notes: Optional[str] = None) -> schemas.LoyaltyRedeemResponse:
    """Mark a customer reward as redeemed with staff accountability."""
    clean_phone = normalize_phone_number(phone) or phone.strip()
    if not clean_phone:
        raise ValueError("Invalid phone number provided.")

    history = get_customer_history(db, clean_phone)
    if not history.reward_available:
        raise ValueError(f"Customer {clean_phone} does not currently have an unlocked reward ready to redeem.")

    redemption = models.CustomerRewardRedemption(
        customer_phone=clean_phone,
        customer_name=history.name,
        redeemed_by_user_id=staff_user.id,
        redeemed_by_name=staff_user.name,
        reward_description=history.reward_description,
        notes=notes
    )
    db.add(redemption)
    db.commit()

    updated_history = get_customer_history(db, clean_phone)
    return schemas.LoyaltyRedeemResponse(
        success=True,
        message=f"Reward '{history.reward_description}' successfully redeemed for {history.name or clean_phone}.",
        phone=clean_phone,
        rewards_unlocked=updated_history.rewards_unlocked,
        rewards_redeemed=updated_history.rewards_redeemed
    )

def get_all_customers_summary(db: Session, search: Optional[str] = None) -> List[schemas.CustomerListItem]:
    """
    Simplified admin customer list:
    Aggregates unique customers from bookings, showing completed visits, last appointment date,
    and My Pet Rewards loyalty progress (stamps / 3).
    """
    query = db.query(models.Booking).filter(models.Booking.status != "blocked")
    bookings = query.order_by(models.Booking.booking_date.desc(), models.Booking.start_time.desc()).all()

    customers_map = {}
    for b in bookings:
        raw_phone = b.customer_phone or (b.user.phone if b.user else "")
        phone = normalize_phone_number(raw_phone)
        if not phone:
            continue
        name = b.customer_name or (b.user.name if b.user else "Customer")

        if phone not in customers_map:
            customers_map[phone] = {
                "phone": phone,
                "name": name,
                "completed_visits": 0,
                "last_appointment_date": b.booking_date,
                "paid_website_visits": 0,
            }

        c = customers_map[phone]
        if b.status == "completed":
            c["completed_visits"] += 1
            if (b.payment_status == "paid") and (b.booking_source and b.booking_source.lower() == "website"):
                c["paid_website_visits"] += 1

        if not c["last_appointment_date"] or b.booking_date > c["last_appointment_date"]:
            c["last_appointment_date"] = b.booking_date

    # Load redemption counts per phone
    redemptions = db.query(models.CustomerRewardRedemption).all()
    redemption_counts = {}
    for r in redemptions:
        r_phone = normalize_phone_number(r.customer_phone)
        redemption_counts[r_phone] = redemption_counts.get(r_phone, 0) + 1

    loyalty_enabled = get_setting_value(db, "loyalty_program_enabled", "true").lower() in ["true", "1", "yes"]

    result = []
    for phone, data in customers_map.items():
        paid_visits = data["paid_website_visits"]
        redeemed = redemption_counts.get(phone, 0)
        unlocked = paid_visits // 3
        stamps = paid_visits % 3
        reward_avail = (unlocked > redeemed) and loyalty_enabled

        item = schemas.CustomerListItem(
            phone=phone,
            name=data["name"],
            completed_visits=data["completed_visits"],
            last_appointment_date=data["last_appointment_date"],
            loyalty_stamps=stamps,
            rewards_unlocked=unlocked,
            reward_available=reward_avail,
        )

        if search:
            s = search.lower().strip()
            if s not in phone.lower() and s not in data["name"].lower():
                continue
        result.append(item)

    # Sort by last_appointment_date descending
    result.sort(key=lambda x: str(x.last_appointment_date or ""), reverse=True)
    return result

def update_booking_invoice(
    db: Session,
    booking_id: int,
    invoice_amount: Decimal,
    payment_status: str = "paid",
    payment_date: Optional[date] = None,
    invoice_notes: Optional[str] = None,
    user: Optional[models.User] = None
) -> models.Booking:
    """Record or correct the final invoice amount and payment status with full audit trail."""
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        raise ValueError("Booking not found.")

    old_amount = db_booking.final_invoice_amount
    old_status = db_booking.payment_status

    db_booking.final_invoice_amount = invoice_amount
    db_booking.payment_status = payment_status
    db_booking.payment_date = payment_date or get_cairo_today()
    if invoice_notes is not None:
        db_booking.invoice_notes = invoice_notes.strip() or None

    user_name = user.name if user else "Staff / Admin"
    audit_entry = models.BookingAuditLog(
        booking_id=db_booking.id,
        user_id=user.id if user else None,
        user_name=user_name,
        action="invoice_updated",
        old_value=f"Amount: {old_amount or 0} EGP, Status: {old_status or 'unpaid'}",
        new_value=f"Amount: {invoice_amount} EGP, Status: {payment_status}, Payment Date: {db_booking.payment_date}",
        reason=invoice_notes
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(db_booking)
    enrich_booking_display(db_booking)
    return db_booking

# --- Booking Status / Reschedule / Audit ---

def update_booking_status(
    db: Session,
    booking_id: int,
    status: str,
    reason: Optional[str] = None,
    final_invoice_amount: Optional[Decimal] = None,
    payment_status: Optional[str] = None,
    payment_date: Optional[date] = None,
    invoice_notes: Optional[str] = None,
    user: Optional[models.User] = None
) -> models.Booking:
    """
    Update booking status (confirmed, completed, cancelled, no-show, blocked).
    Rules:
      - Allows future No-show & Cancelled actions.
      - Releases slot when marked No-show or Cancelled.
      - Rechecks capacity before restoring from No-show or Cancelled to confirmed!
      - Records status changes & invoice entries in audit history.
      - Triggers Telegram alert on cancellation.
    """
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        raise ValueError("Booking not found.")

    old_status = db_booking.status

    # If restoring a No-show or Cancelled back to Confirmed/Completed, verify capacity first!
    if old_status in ["no-show", "cancelled"] and status in ["confirmed", "completed"]:
        max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "1"))
        is_available = check_overlap_capacity(
            db,
            db_booking.booking_date,
            db_booking.start_time,
            db_booking.end_time,
            max_cap,
            ignore_booking_id=db_booking.id
        )
        if not is_available:
            raise ValueError(f"Cannot restore booking: this time slot ({db_booking.start_time.strftime('%I:%M %p')} on {db_booking.booking_date}) is already fully booked.")

    # Prevent completing appointments before scheduled start time has arrived
    if status == "completed":
        now_cairo = get_cairo_now()
        booking_dt = datetime.combine(db_booking.booking_date, db_booking.start_time, tzinfo=CAIRO_TZ)
        if booking_dt > now_cairo:
            raise ValueError(
                f"Cannot mark appointment as completed before its scheduled start time "
                f"({db_booking.start_time.strftime('%I:%M %p')} on {db_booking.booking_date.strftime('%b %d, %Y')})."
            )

    db_booking.status = status
    if reason:
        db_booking.cancellation_reason = reason.strip()

    if status == "completed":
        if final_invoice_amount is not None:
            db_booking.final_invoice_amount = final_invoice_amount
            db_booking.payment_status = payment_status or "paid"
            db_booking.payment_date = payment_date or get_cairo_today()
            if invoice_notes:
                db_booking.invoice_notes = invoice_notes.strip()
        elif not db_booking.payment_status:
            db_booking.payment_status = "unpaid"

    # Create audit log
    action_type = "restored" if old_status in ["no-show", "cancelled"] and status == "confirmed" else "status_changed"
    user_name = user.name if user else "Staff / Admin"
    user_id = user.id if user else None

    log_new_val = f"Status: {status}"
    if final_invoice_amount is not None:
        log_new_val += f" (Invoice: {final_invoice_amount} EGP, {db_booking.payment_status})"

    audit_entry = models.BookingAuditLog(
        booking_id=db_booking.id,
        user_id=user_id,
        user_name=user_name,
        action=action_type,
        old_value=f"Status: {old_status}",
        new_value=log_new_val,
        reason=reason.strip() if reason else None
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(db_booking)

    # Dispatch Telegram alert if cancelled
    if status == "cancelled":
        try:
            from backend.app.telegram import notify_booking_cancelled
            notify_booking_cancelled(db_booking, reason=reason, cancelled_by=user_name, db=db)
        except Exception:
            pass

    enrich_booking_display(db_booking)
    return db_booking

def update_booking_details(
    db: Session,
    booking_id: int,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    special_notes: Optional[str] = None,
    user: Optional[models.User] = None
) -> models.Booking:
    """Update customer details on an existing booking without overwriting legacy user profiles."""
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        raise ValueError("Booking not found.")

    changes = []
    if customer_name is not None and customer_name.strip() and customer_name.strip() != (db_booking.customer_name or ""):
        old_val = db_booking.customer_name
        db_booking.customer_name = customer_name.strip()
        changes.append(f"Name changed from '{old_val}' to '{db_booking.customer_name}'")

    if customer_phone is not None and customer_phone.strip():
        clean_phone = normalize_phone_number(customer_phone)
        if not is_valid_egyptian_phone(clean_phone):
            raise ValueError("Please enter a valid Egyptian mobile number (e.g. 01012345678 or +201012345678).")
        if clean_phone != db_booking.customer_phone:
            old_val = db_booking.customer_phone
            db_booking.customer_phone = clean_phone
            changes.append(f"Phone changed from '{old_val}' to '{clean_phone}'")

    if special_notes is not None:
        new_notes = special_notes.strip() or None
        if new_notes != db_booking.special_notes:
            db_booking.special_notes = new_notes
            changes.append("Special notes updated")

    if changes:
        user_name = user.name if user else "Staff / Admin"
        audit_entry = models.BookingAuditLog(
            booking_id=db_booking.id,
            user_id=user.id if user else None,
            user_name=user_name,
            action="details_updated",
            old_value=None,
            new_value="; ".join(changes),
            reason=None
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(db_booking)

    enrich_booking_display(db_booking)
    return db_booking

def reschedule_booking(
    db: Session,
    booking_id: int,
    new_date: date,
    new_start_time: time,
    user: Optional[models.User] = None
) -> models.Booking:
    """Reschedule an existing booking with schedule & capacity checks in Cairo time."""
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        raise ValueError("Booking not found.")

    duration = 60
    slot_interval = int(get_setting_value(db, "slot_interval_minutes", "60"))
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "1"))
    max_days = int(get_setting_value(db, "max_booking_days_ahead", "5"))

    if new_start_time.minute % slot_interval != 0:
        raise ValueError("Appointments must be scheduled on whole hours (e.g. 1:00 PM, 2:00 PM).")

    today_cairo = get_cairo_today()
    max_date = today_cairo + timedelta(days=max_days - 1)
    if new_date < today_cairo or new_date > max_date:
        raise ValueError(f"Appointments can be scheduled up to {max_days} days in advance.")

    opening_time, closing_time, is_friday = get_daily_operating_hours(db, new_date)
    if opening_time is None or closing_time is None:
        raise ValueError("Center is closed for appointments on this date.")

    s_min = new_start_time.hour * 60 + new_start_time.minute
    e_min = s_min + duration

    op_min = opening_time.hour * 60 + opening_time.minute
    cl_min = closing_time.hour * 60 + closing_time.minute
    if cl_min <= op_min:
        cl_min += 24 * 60

    if s_min < op_min or e_min > cl_min:
        raise ValueError(f"Appointments are available between {opening_time.strftime('%I:%M %p')} and {closing_time.strftime('%I:%M %p')}.")

    now_cairo = get_cairo_now()
    if new_date == today_cairo and s_min <= (now_cairo.hour * 60 + now_cairo.minute):
        raise ValueError("Cannot reschedule to a time slot in the past.")

    end_hour = (e_min // 60) % 24
    end_minute = e_min % 60
    new_end_time = time(end_hour, end_minute)

    is_available = check_overlap_capacity(
        db,
        new_date,
        new_start_time,
        new_end_time,
        max_cap,
        ignore_booking_id=db_booking.id
    )
    if not is_available:
        raise ValueError("Selected time slot is already fully booked.")

    old_date = db_booking.booking_date
    old_time = db_booking.start_time

    db_booking.booking_date = new_date
    db_booking.start_time = new_start_time
    db_booking.end_time = new_end_time
    db_booking.status = "confirmed"

    user_name = user.name if user else "Staff / Admin"
    audit_entry = models.BookingAuditLog(
        booking_id=db_booking.id,
        user_id=user.id if user else None,
        user_name=user_name,
        action="rescheduled",
        old_value=f"Original: {old_date} at {old_time.strftime('%I:%M %p')}",
        new_value=f"Rescheduled to: {new_date} at {new_start_time.strftime('%I:%M %p')}",
        reason=None
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(db_booking)

    # Dispatch Telegram notification for rescheduled booking
    try:
        from backend.app.telegram import notify_booking_rescheduled
        notify_booking_rescheduled(
            db_booking,
            old_date_str=old_date.strftime('%B %d, %Y'),
            old_time_str=old_time.strftime('%I:%M %p'),
            rescheduled_by=user_name,
            db=db
        )
    except Exception:
        pass

    enrich_booking_display(db_booking)
    return db_booking

# --- Friday Conflicting Bookings Detection ---

def get_friday_conflicts(db: Session) -> List[schemas.FridayConflictBooking]:
    """
    Find active bookings on a Friday with start times before 3:00 PM.
    These are flagged for staff review rather than silently modified.
    """
    active_bookings = db.query(models.Booking).filter(
        models.Booking.status.in_(["confirmed", "completed"])
    ).all()

    conflicts = []
    for b in active_bookings:
        if b.booking_date.weekday() == 4:  # Friday
            if b.start_time < time(15, 0, 0):
                conflicts.append(schemas.FridayConflictBooking(
                    id=b.id,
                    booking_id=b.booking_id,
                    customer_name=b.customer_name or (b.user.name if b.user else "Guest"),
                    customer_phone=b.customer_phone or (b.user.phone if b.user else ""),
                    booking_date=b.booking_date,
                    start_time=b.start_time,
                    status=b.status
                ))
    return conflicts

# --- Dashboard Statistics ---

def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    """
    Accurate dashboard statistics:
      - Clearly defined totals for confirmed, completed, no-show, and blocked.
      - Exclude blocked periods from customer appointment totals.
      - Calculate capacity accounting for Friday's shorter schedule.
      - Flag Friday conflicts for staff review.
    """
    today_cairo = get_cairo_today()
    is_friday = today_cairo.weekday() == 4
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "1"))

    today_bookings = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service)
    ).filter(
        models.Booking.booking_date == today_cairo
    ).all()

    # Clear breakdown of totals
    today_total = sum(1 for b in today_bookings if b.status != "blocked")
    today_confirmed = sum(1 for b in today_bookings if b.status == "confirmed")
    today_completed = sum(1 for b in today_bookings if b.status == "completed")
    today_no_show = sum(1 for b in today_bookings if b.status == "no-show")
    today_blocked = sum(1 for b in today_bookings if b.status == "blocked")

    upcoming_confirmed = db.query(models.Booking).filter(
        models.Booking.booking_date > today_cairo,
        models.Booking.status == "confirmed"
    ).count()

    recent_bookings = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service),
        joinedload(models.Booking.audit_logs)
    ).order_by(
        models.Booking.created_at.desc()
    ).limit(10).all()

    for b in recent_bookings:
        enrich_booking_display(b)

    # Schedule capacity: Friday has 8 slots (15:00 to 22:00); other days have 11 slots (12:00 to 22:00)
    slots_count = 8 if is_friday else 11
    total_schedule_capacity = slots_count * max_cap

    # Occupied slots are confirmed, completed, or blocked. No-show is NOT occupied.
    occupied_slots = sum(1 for b in today_bookings if b.status in ["confirmed", "completed", "blocked"])

    capacity_percentage = 0.0
    if total_schedule_capacity > 0:
        capacity_percentage = round((occupied_slots / total_schedule_capacity) * 100, 1)
        capacity_percentage = min(capacity_percentage, 100.0)

    day_label = "Friday 3:00 PM – 11:00 PM (8 slots)" if is_friday else "12:00 PM – 11:00 PM (11 slots)"
    capacity_explanation = (
        f"Measures occupied slots ({occupied_slots}/{total_schedule_capacity}) against today's {day_label} "
        f"at {max_cap} appointment(s) per slot. Released no-show bookings are excluded."
    )

    friday_conflicts = get_friday_conflicts(db)

    today_cancelled = sum(1 for b in today_bookings if b.status == "cancelled")

    total_bookings = db.query(models.Booking).filter(models.Booking.status != "blocked").count()
    total_completed = db.query(models.Booking).filter(models.Booking.status == "completed").count()
    total_cancelled = db.query(models.Booking).filter(models.Booking.status == "cancelled").count()
    total_no_show = db.query(models.Booking).filter(models.Booking.status == "no-show").count()

    total_revenue_records = db.query(models.Booking.final_invoice_amount).filter(
        models.Booking.payment_status == "paid",
        models.Booking.final_invoice_amount != None
    ).all()
    total_revenue_collected = sum([Decimal(str(r[0])) for r in total_revenue_records if r[0]], Decimal(0))

    return schemas.DashboardStats(
        today_total=today_total,
        today_confirmed=today_confirmed,
        today_completed=today_completed,
        today_cancelled=today_cancelled,
        today_no_show=today_no_show,
        today_blocked=today_blocked,
        upcoming_confirmed=upcoming_confirmed,
        total_bookings=total_bookings,
        total_completed=total_completed,
        total_cancelled=total_cancelled,
        total_no_show=total_no_show,
        total_revenue_collected=total_revenue_collected,
        recent_bookings=recent_bookings,
        capacity_percentage=capacity_percentage,
        capacity_explanation=capacity_explanation,
        friday_conflicts_count=len(friday_conflicts),
        friday_conflicts=friday_conflicts
    )

# --- Monthly Website Revenue Report ---

def get_monthly_revenue_report(db: Session, year: int, month: int) -> schemas.MonthlyRevenueReport:
    """
    Website Revenue Report:
    - Base revenue summaries on actual payment dates where paid, or booking_date for bookings in that month.
    - Tracks website vs manual bookings.
    - Handles refunds and adjustments cleanly.
    """
    import calendar
    m_name = calendar.month_name[month]
    _, last_day = calendar.monthrange(year, month)
    m_start = date(year, month, 1)
    m_end = date(year, month, last_day)

    query = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.service)
    ).filter(
        models.Booking.status != "blocked",
        or_(
            and_(models.Booking.payment_date != None, models.Booking.payment_date >= m_start, models.Booking.payment_date <= m_end),
            and_(models.Booking.payment_date == None, models.Booking.booking_date >= m_start, models.Booking.booking_date <= m_end)
        )
    ).order_by(models.Booking.booking_date.desc(), models.Booking.start_time.asc())

    bookings = query.all()

    website_bookings = [b for b in bookings if b.booking_source and b.booking_source.lower() == "website"]
    manual_bookings = [b for b in bookings if not (b.booking_source and b.booking_source.lower() == "website")]

    completed_website = [b for b in website_bookings if b.status == "completed"]
    paid_website = [b for b in website_bookings if b.payment_status == "paid" and b.final_invoice_amount]
    unpaid_website = [b for b in website_bookings if b.payment_status != "paid" and b.status != "cancelled"]
    total_website_rev = sum([Decimal(str(b.final_invoice_amount)) for b in paid_website], Decimal(0))
    avg_website_invoice = (total_website_rev / len(paid_website)) if paid_website else Decimal(0)

    completed_manual = [b for b in manual_bookings if b.status == "completed"]
    paid_manual = [b for b in manual_bookings if b.payment_status == "paid" and b.final_invoice_amount]
    total_manual_rev = sum([Decimal(str(b.final_invoice_amount)) for b in paid_manual], Decimal(0))

    grand_total_rev = total_website_rev + total_manual_rev

    items = []
    for b in bookings:
        items.append(schemas.RevenueReportItem(
            id=b.id,
            booking_id=b.booking_id,
            customer_name=b.customer_name or (b.user.name if b.user else "Guest"),
            customer_phone=b.customer_phone or (b.user.phone if b.user else ""),
            booking_date=b.booking_date,
            payment_date=b.payment_date,
            booking_source=b.booking_source or "unspecified",
            status=b.status,
            payment_status=b.payment_status or "unpaid",
            final_invoice_amount=Decimal(str(b.final_invoice_amount or 0)),
            invoice_notes=b.invoice_notes
        ))

    return schemas.MonthlyRevenueReport(
        year=year,
        month=month,
        month_name=m_name,
        total_website_bookings=len(website_bookings),
        completed_website_bookings=len(completed_website),
        paid_website_invoices_count=len(paid_website),
        total_website_revenue=total_website_rev,
        unpaid_website_bookings_count=len(unpaid_website),
        average_website_invoice_value=round(avg_website_invoice, 2),
        total_manual_bookings=len(manual_bookings),
        completed_manual_bookings=len(completed_manual),
        paid_manual_invoices_count=len(paid_manual),
        total_manual_revenue=total_manual_rev,
        grand_total_revenue=grand_total_rev,
        items=items
    )

# --- Admin Block Slot ---

def block_admin_slot(
    db: Session,
    admin_user: models.User,
    booking_date: date,
    start_time: time,
    duration: int = 60,
    reason: str = "Staff Maintenance / Slot Block"
) -> models.Booking:
    """Block a grooming time slot. Excluded from customer totals; displayed as Blocked Time."""
    s_min = start_time.hour * 60 + start_time.minute
    e_min = s_min + duration
    end_hour = (e_min // 60) % 24
    end_minute = e_min % 60
    end_time = time(end_hour, end_minute)

    max_id = db.query(models.Booking.id).order_by(models.Booking.id.desc()).first()
    base_num = (max_id[0] if max_id else 0) + 101
    booking_id = f"BLK-{base_num:05d}"
    while db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first():
        base_num += 1
        booking_id = f"BLK-{base_num:05d}"

    db_booking = models.Booking(
        booking_id=booking_id,
        customer_name="Staff Maintenance",
        customer_phone=None,
        user_id=admin_user.id,
        pet_id=None,
        service_id=None,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        price=0,
        special_notes=reason,
        cancellation_reason=None,
        booking_source="staff",
        status="blocked"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    audit_entry = models.BookingAuditLog(
        booking_id=db_booking.id,
        user_id=admin_user.id,
        user_name=admin_user.name,
        action="blocked",
        old_value=None,
        new_value=f"Blocked {start_time.strftime('%I:%M %p')} on {booking_date}: {reason}",
        reason=reason
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(db_booking)
    db_booking.service_name_display = "Blocked Time"
    return db_booking
