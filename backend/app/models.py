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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    special_notes = Column(Text, nullable=True)
    status = Column(String, default="confirmed", nullable=False)  # 'confirmed', 'completed', 'no-show'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookings")
    pet = relationship("Pet", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
