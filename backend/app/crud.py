import threading
from datetime import date, time, datetime, timedelta
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from backend.app import models, schemas

# Global lock for SQLite local synchronization
sqlite_booking_lock = threading.Lock()

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

def get_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    clean_phone = normalize_phone_number(phone)
    return db.query(models.User).filter(
        or_(
            models.User.phone == clean_phone,
            models.User.phone == phone.strip()
        )
    ).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    clean_email = email.strip().lower()
    return db.query(models.User).filter(models.User.email == clean_email).first()

def get_user_by_identifier(db: Session, identifier: str) -> Optional[models.User]:
    clean_phone = normalize_phone_number(identifier)
    clean_id = identifier.strip()
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
    phone: str,
    password_hash: str,
    role: str = "customer",
    email: Optional[str] = None
) -> models.User:
    clean_phone = normalize_phone_number(phone) or phone.strip()
    clean_email = email.strip().lower() if email and email.strip() else None
    user = models.User(
        name=name.strip(),
        phone=clean_phone,
        email=clean_email,
        password_hash=password_hash,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# --- Pet Operations ---

def get_or_create_pet(
    db: Session,
    user_id: int,
    pet_type: str,
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
    # 1. Convert proposed start and end times to minutes since midnight of booking_date
    s_min = start_time.hour * 60 + start_time.minute
    e_min = end_time.hour * 60 + end_time.minute
    if e_min <= s_min:
        e_min += 24 * 60  # Handle crossing midnight

    # 2. Query all active bookings on this date (confirmed, completed, or blocked by admin)
    query = db.query(models.Booking).filter(
        models.Booking.booking_date == booking_date,
        models.Booking.status.in_(["confirmed", "completed", "blocked"])
    )
    if ignore_booking_id:
        query = query.filter(models.Booking.id != ignore_booking_id)
        
    bookings = query.all()

    # 3. Represent existing bookings as intervals of minutes since midnight
    intervals = []
    for b in bookings:
        b_s = b.start_time.hour * 60 + b.start_time.minute
        b_e = b.end_time.hour * 60 + b.end_time.minute
        if b_e <= b_s:
            b_e += 24 * 60
        intervals.append((b_s, b_e))

    # 4. Check if there is any overlap and count overlaps in sub-intervals
    event_times = [s_min, e_min]
    for b_s, b_e in intervals:
        if b_s < e_min and s_min < b_e:
            if s_min < b_s < e_min:
                event_times.append(b_s)
            if s_min < b_e < e_min:
                event_times.append(b_e)

    # Sort unique event times to create sub-intervals
    event_times = sorted(list(set(event_times)))

    # For each sub-interval [t_j, t_j+1], check capacity
    for i in range(len(event_times) - 1):
        t1 = event_times[i]
        t2 = event_times[i+1]
        if t1 >= t2:
            continue
        
        # Count how many bookings cover this sub-interval
        count = 0
        for b_s, b_e in intervals:
            if b_s <= t1 and t2 <= b_e:
                count += 1
                
        # If count >= max_capacity (2), slot is unavailable
        if count >= max_capacity:
            return False

    return True

def get_available_slots(db: Session, booking_date: date, service_id: Optional[int] = None) -> List[schemas.TimeSlot]:
    duration = 60  # Default 60-minute session
    if service_id:
        service = get_service_by_id(db, service_id)
        if service:
            duration = service.duration
    else:
        first_service = db.query(models.Service).filter(models.Service.active == True).first()
        if first_service:
            duration = first_service.duration

    # Get business settings
    opening_str = get_setting_value(db, "opening_time", "15:00:00")
    closing_str = get_setting_value(db, "closing_time", "00:00:00")
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "2"))
    max_days = int(get_setting_value(db, "max_booking_days_ahead", "7"))

    # Convert settings strings to time objects
    opening_time = datetime.strptime(opening_str, "%H:%M:%S").time()
    closing_time = datetime.strptime(closing_str, "%H:%M:%S").time()

    # Calculate allowed booking date window
    today = date.today()
    max_date = today + timedelta(days=max_days - 1)

    # Get opening/closing minutes
    op_min = opening_time.hour * 60 + opening_time.minute
    cl_min = closing_time.hour * 60 + closing_time.minute
    if cl_min <= op_min:
        cl_min += 24 * 60  # Crossed midnight (e.g. 15:00 to 24:00/00:00)

    # Get current time for past-slot filtering
    now = datetime.now()
    current_date = now.date()
    current_time_min = now.hour * 60 + now.minute

    slots = []
    # 30-minute intervals
    current_min = op_min
    while current_min <= cl_min - duration:
        slot_hour = (current_min // 60) % 24
        slot_minute = current_min % 60
        slot_time = time(slot_hour, slot_minute)

        # Proposed end time
        end_min = current_min + duration
        end_hour = (end_min // 60) % 24
        end_minute = end_min % 60
        end_time = time(end_hour, end_minute)

        # 1. Date is in the past or beyond max booking window
        if booking_date < today or booking_date > max_date:
            available = False
        # 2. Filter out past slots if booking date is today
        elif booking_date == current_date and current_min <= current_time_min:
            available = False
        else:
            # 3. Check overlap capacity against actual reservations (max 2 simultaneous pets)
            available = check_overlap_capacity(db, booking_date, slot_time, end_time, max_cap)

        slots.append(schemas.TimeSlot(time=slot_time, available=available))
        current_min += 30

    return slots

# --- Booking Creation & Operations ---

def create_booking(
    db: Session,
    user: models.User,
    booking_in: schemas.BookingCreate
) -> models.Booking:
    is_sqlite = db.bind.dialect.name == "sqlite"
    
    if is_sqlite:
        sqlite_booking_lock.acquire()

    try:
        # Load business settings
        opening_str = get_setting_value(db, "opening_time", "15:00:00")
        closing_str = get_setting_value(db, "closing_time", "00:00:00")
        max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "2"))
        max_days = int(get_setting_value(db, "max_booking_days_ahead", "7"))

        opening_time = datetime.strptime(opening_str, "%H:%M:%S").time()
        closing_time = datetime.strptime(closing_str, "%H:%M:%S").time()

        if not is_sqlite:
            # Row lock for PostgreSQL
            db.query(models.Setting).filter(models.Setting.key == "max_simultaneous_bookings").with_for_update().first()

        # 1. Validate date range
        today = date.today()
        max_date = today + timedelta(days=max_days - 1)
        if booking_in.booking_date < today or booking_in.booking_date > max_date:
            raise ValueError(f"Bookings are available up to {max_days} days in advance.")

        # 2. Validate service exists or use default
        if booking_in.service_id:
            service = get_service_by_id(db, booking_in.service_id)
        else:
            service = db.query(models.Service).filter(models.Service.active == True).first()

        if not service or not service.active:
            raise ValueError("Selected service is invalid or inactive.")

        # 3. Calculate start/end minutes and check working hours
        s_min = booking_in.start_time.hour * 60 + booking_in.start_time.minute
        e_min = s_min + service.duration
        
        op_min = opening_time.hour * 60 + opening_time.minute
        cl_min = closing_time.hour * 60 + closing_time.minute
        if cl_min <= op_min:
            cl_min += 24 * 60

        if s_min < op_min or e_min > cl_min:
            raise ValueError(f"Grooming appointments are available from {opening_str[:5]} to {closing_str[:5]}.")

        # 4. Check for past slots today
        now = datetime.now()
        if booking_in.booking_date == now.date() and s_min <= (now.hour * 60 + now.minute):
            raise ValueError("Cannot book a time slot in the past.")

        # 5. Validate Pet Info & Pricing Mapping with Graceful Fallbacks
        pet_breed = None
        pet_size = None
        pet_type = "dog"

        if booking_in.pet_type == "dog":
            pet_size = booking_in.pet_size if booking_in.pet_size in ["small", "large"] else "small"
            pet_breed = booking_in.pet_breed.strip() if (booking_in.pet_breed and booking_in.pet_breed.strip()) else "Dog"
            pet_type = "dog"

            # Ensure service matches pet configuration
            if service.pet_type != "dog" or service.pet_size != pet_size:
                alternative_service = db.query(models.Service).filter(
                    models.Service.name == service.name,
                    models.Service.pet_type == "dog",
                    models.Service.pet_size == pet_size,
                    models.Service.active == True
                ).first()
                if alternative_service:
                    service = alternative_service

        elif booking_in.pet_type == "cat":
            pet_breed = booking_in.pet_breed.strip() if (booking_in.pet_breed and booking_in.pet_breed.strip()) else "Cat"
            pet_size = None
            pet_type = "cat"

            if service.pet_type != "cat" and not (service.pet_type == "dog" and service.pet_size == "small"):
                alternative_service = db.query(models.Service).filter(
                    models.Service.name == service.name,
                    models.Service.pet_type == "cat",
                    models.Service.active == True
                ).first()
                if not alternative_service:
                    alternative_service = db.query(models.Service).filter(
                        models.Service.name == service.name,
                        models.Service.pet_type == "dog",
                        models.Service.pet_size == "small",
                        models.Service.active == True
                    ).first()
                if alternative_service:
                    service = alternative_service
        else:
            # Generic customer booking (3-step quick booking)
            pet_type = "dog"
            pet_size = "small"
            pet_breed = "Pet"

        # 6. Verify availability (concurrency safe max 2 pets)
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

        # 7. Pet creation / association
        pet = get_or_create_pet(
            db,
            user_id=user.id,
            pet_type=pet_type,
            breed=pet_breed,
            size=pet_size
        )

        # 8. Generate Guaranteed Unique Booking ID (e.g. MPC-000123)
        max_id = db.query(models.Booking.id).order_by(models.Booking.id.desc()).first()
        base_num = (max_id[0] if max_id else 0) + 123
        booking_id = f"MPC-{base_num:06d}"
        while db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first():
            base_num += 1
            booking_id = f"MPC-{base_num:06d}"

        # 9. Create Booking with backend calculated price
        db_booking = models.Booking(
            booking_id=booking_id,
            user_id=user.id,
            pet_id=pet.id,
            service_id=service.id,
            booking_date=booking_in.booking_date,
            start_time=booking_in.start_time,
            end_time=end_time,
            price=service.discounted_price,  # Source of truth pricing
            special_notes=booking_in.special_notes.strip() if booking_in.special_notes else None,
            status="confirmed"
        )
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        return db_booking

    finally:
        if is_sqlite:
            sqlite_booking_lock.release()

def get_user_bookings(db: Session, user_id: int) -> List[models.Booking]:
    return db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service)
    ).filter(
        models.Booking.user_id == user_id
    ).order_by(
        models.Booking.booking_date.desc(),
        models.Booking.start_time.desc()
    ).all()

def get_bookings(
    db: Session,
    customer_name: Optional[str] = None,
    phone: Optional[str] = None,
    booking_date: Optional[date] = None,
    status: Optional[str] = None,
    limit: int = 200
) -> List[models.Booking]:
    query = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service)
    )

    if booking_date:
        query = query.filter(models.Booking.booking_date == booking_date)
        
    if status:
        query = query.filter(models.Booking.status == status)

    if customer_name:
        query = query.join(models.User).filter(models.User.name.ilike(f"%{customer_name}%"))
        
    if phone:
        query = query.join(models.User, isouter=True).filter(models.User.phone.contains(phone))

    return query.order_by(models.Booking.booking_date.desc(), models.Booking.start_time.asc()).limit(limit).all()

def update_booking_status(db: Session, booking_id: int, status: str) -> Optional[models.Booking]:
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if db_booking:
        db_booking.status = status
        db.commit()
        db.refresh(db_booking)
    return db_booking

def reschedule_booking(
    db: Session,
    booking_id: int,
    new_date: date,
    new_start_time: time
) -> models.Booking:
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        raise ValueError("Booking not found.")

    service = db_booking.service
    if not service:
        raise ValueError("Associated service not found.")

    # Business settings
    opening_str = get_setting_value(db, "opening_time", "15:00:00")
    closing_str = get_setting_value(db, "closing_time", "00:00:00")
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "2"))
    max_days = int(get_setting_value(db, "max_booking_days_ahead", "7"))

    opening_time = datetime.strptime(opening_str, "%H:%M:%S").time()
    closing_time = datetime.strptime(closing_str, "%H:%M:%S").time()

    # 1. Date range
    today = date.today()
    max_date = today + timedelta(days=max_days - 1)
    if new_date < today or new_date > max_date:
        raise ValueError(f"Appointments can be scheduled up to {max_days} days in advance.")

    # 2. Time bounds
    s_min = new_start_time.hour * 60 + new_start_time.minute
    e_min = s_min + service.duration
    
    op_min = opening_time.hour * 60 + opening_time.minute
    cl_min = closing_time.hour * 60 + closing_time.minute
    if cl_min <= op_min:
        cl_min += 24 * 60

    if s_min < op_min or e_min > cl_min:
        raise ValueError(f"Grooming appointments are available from {opening_str[:5]} to {closing_str[:5]}.")

    end_hour = (e_min // 60) % 24
    end_minute = e_min % 60
    new_end_time = time(end_hour, end_minute)

    # 3. Check capacity ignoring current booking ID
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

    # Update schedule
    db_booking.booking_date = new_date
    db_booking.start_time = new_start_time
    db_booking.end_time = new_end_time
    db_booking.status = "confirmed"
    db.commit()
    db.refresh(db_booking)
    return db_booking

def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    today = date.today()
    
    # 1. Today's bookings count
    today_count = db.query(models.Booking).filter(
        models.Booking.booking_date == today,
        models.Booking.status.in_(["confirmed", "completed"])
    ).count()

    # 2. Upcoming bookings count (tomorrow onwards)
    upcoming_count = db.query(models.Booking).filter(
        models.Booking.booking_date > today,
        models.Booking.status == "confirmed"
    ).count()

    # 3. Recent Bookings (last 10)
    recent_bookings = db.query(models.Booking).options(
        joinedload(models.Booking.user),
        joinedload(models.Booking.pet),
        joinedload(models.Booking.service)
    ).order_by(
        models.Booking.created_at.desc()
    ).limit(10).all()

    # 4. Today's Capacity Percentage
    opening_str = get_setting_value(db, "opening_time", "15:00:00")
    closing_str = get_setting_value(db, "closing_time", "00:00:00")
    max_cap = int(get_setting_value(db, "max_simultaneous_bookings", "2"))

    opening_time = datetime.strptime(opening_str, "%H:%M:%S").time()
    closing_time = datetime.strptime(closing_str, "%H:%M:%S").time()

    op_min = opening_time.hour * 60 + opening_time.minute
    cl_min = closing_time.hour * 60 + closing_time.minute
    if cl_min <= op_min:
        cl_min += 24 * 60

    total_operating_minutes = cl_min - op_min
    total_slot_capacity_minutes = total_operating_minutes * max_cap

    today_bookings = db.query(models.Booking).filter(
        models.Booking.booking_date == today,
        models.Booking.status.in_(["confirmed", "completed"])
    ).all()

    total_booked_minutes = 0
    for b in today_bookings:
        b_s = b.start_time.hour * 60 + b.start_time.minute
        b_e = b.end_time.hour * 60 + b.end_time.minute
        if b_e <= b_s:
            b_e += 24 * 60
        
        b_s = max(b_s, op_min)
        b_e = min(b_e, cl_min)
        if b_e > b_s:
            total_booked_minutes += (b_e - b_s)

    capacity_percentage = 0.0
    if total_slot_capacity_minutes > 0:
        capacity_percentage = round((total_booked_minutes / total_slot_capacity_minutes) * 100, 1)
        capacity_percentage = min(capacity_percentage, 100.0)

    return schemas.DashboardStats(
        today_count=today_count,
        upcoming_count=upcoming_count,
        recent_bookings=recent_bookings,
        capacity_percentage=capacity_percentage
    )

def block_admin_slot(
    db: Session,
    admin_user: models.User,
    booking_date: date,
    start_time: time,
    duration: int = 60,
    reason: str = "Admin Slot Block / Maintenance"
) -> models.Booking:
    s_min = start_time.hour * 60 + start_time.minute
    e_min = s_min + duration
    end_hour = (e_min // 60) % 24
    end_minute = e_min % 60
    end_time = time(end_hour, end_minute)

    # Find or create a system pet for admin block
    pet = get_or_create_pet(db, user_id=admin_user.id, pet_type="dog", breed="Admin Block", size="small")
    service = db.query(models.Service).first()
    if not service:
        raise ValueError("No service found to attach block slot.")

    max_id = db.query(models.Booking.id).order_by(models.Booking.id.desc()).first()
    base_num = (max_id[0] if max_id else 0) + 101
    booking_id = f"BLK-{base_num:05d}"
    while db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first():
        base_num += 1
        booking_id = f"BLK-{base_num:05d}"

    db_booking = models.Booking(
        booking_id=booking_id,
        user_id=admin_user.id,
        pet_id=pet.id,
        service_id=service.id,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        price=0,
        special_notes=reason,
        status="blocked"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

