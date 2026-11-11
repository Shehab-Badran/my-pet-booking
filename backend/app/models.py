from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Numeric,
    Date,
    Time,
    Boolean,
    Text
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="customer", nullable=False)  # 'customer' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pets = relationship("Pet", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # 'dog' or 'cat'
    breed = Column(String, nullable=True)  # Nullable for cats
    size = Column(String, nullable=True)   # 'small' or 'large' (only for dogs)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="pets")
    bookings = relationship("Booking", back_populates="pet")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # 'Shower' or 'Cut'
    pet_type = Column(String, nullable=False)  # 'dog' or 'cat'
    pet_size = Column(String, nullable=False)  # 'small', 'large', or 'any'
    original_price = Column(Numeric(10, 2), nullable=False)
    discounted_price = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Integer, default=50, nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    # Backward compatibility alias for price -> discounted_price
    @property
    def price(self):
        return self.discounted_price

    # Relationships
    bookings = relationship("Booking", back_populates="service")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String, unique=True, index=True, nullable=False)  # e.g. MPC-000123
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    price = Column(Numeric(10, 2), nullable=True, default=0)
    special_notes = Column(Text, nullable=True)
    cancellation_reason = Column(String, nullable=True)  # e.g. 'Customer cancelled by phone'
    booking_source = Column(String, default="website", nullable=True)  # 'website', 'phone', 'whatsapp', 'walk-in'
    status = Column(String, default="confirmed", nullable=False)  # 'confirmed', 'completed', 'cancelled', 'no-show', 'blocked'
    final_invoice_amount = Column(Numeric(10, 2), nullable=True)
    payment_status = Column(String, default="unpaid", nullable=True)  # 'paid', 'unpaid', 'refunded'
    payment_date = Column(Date, nullable=True)
    invoice_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Helper properties for customer display
    @property
    def display_name(self):
        return self.customer_name or (self.user.name if self.user else "Guest")

    @property
    def display_phone(self):
        return self.customer_phone or (self.user.phone if self.user else "")

    # Relationships
    user = relationship("User", back_populates="bookings")
    pet = relationship("Pet", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    audit_logs = relationship("BookingAuditLog", back_populates="booking", cascade="all, delete-orphan", order_by="desc(BookingAuditLog.created_at)")


class BookingAuditLog(Base):
    __tablename__ = "booking_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String, nullable=False)  # 'created', 'status_changed', 'rescheduled', 'details_updated', 'restored'
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="audit_logs")
    user = relationship("User")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)


class CustomerRewardRedemption(Base):
    __tablename__ = "customer_reward_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_phone = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    redeemed_at = Column(DateTime, default=datetime.utcnow)
    redeemed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    redeemed_by_name = Column(String, nullable=True)
    reward_description = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    redeemed_by = relationship("User")
