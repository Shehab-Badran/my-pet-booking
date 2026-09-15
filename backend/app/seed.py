from sqlalchemy import text
from backend.app.database import engine, SessionLocal, Base
from backend.app import models
from backend.app.auth import hash_password
from backend.app.config import settings

def seed_db():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate SQLite missing columns if any
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
            conn.commit()
            print("Migrated database: added 'email' column to users table.")
        except Exception:
            pass

    db = SessionLocal()
    try:
        # 1. Business Settings (Internal Scheduling Rules)
        settings_to_seed = {
            "opening_time": "15:00:00",
            "closing_time": "00:00:00",
            "max_simultaneous_bookings": "1",
            "max_booking_days_ahead": "7",
            "slot_interval_minutes": "60"
        }

        print("Seeding internal business settings...")
        for key, val in settings_to_seed.items():
            existing = db.query(models.Setting).filter(models.Setting.key == key).first()
            if not existing:
                db_setting = models.Setting(key=key, value=val)
                db.add(db_setting)
                print(f"Added setting: {key} = {val}")
            else:
                existing.value = val
                print(f"Setting updated: {key} = {val}")

        # 2. Seed Admin & Test Customer Users
        print("\nSeeding users from secure environment configuration...")
        admin_email = settings.ADMIN_EMAIL
        admin_phone = settings.ADMIN_PHONE
        admin_password = settings.ADMIN_PASSWORD

        admin = db.query(models.User).filter(
            (models.User.email == admin_email) | (models.User.phone == admin_phone)
        ).first()

        if not admin:
            admin = models.User(
                name="My Pet Center Admin",
                phone=admin_phone,
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="admin"
            )
            db.add(admin)
            print(f"Created Admin account: Email={admin_email}, Phone={admin_phone}")
        else:
            admin.role = "admin"
            admin.email = admin_email
            admin.phone = admin_phone
            admin.password_hash = hash_password(admin_password)
            print(f"Admin account updated/verified: Email={admin_email}, Phone={admin_phone}")

        customer_phone = "01234567890"
        customer = db.query(models.User).filter(models.User.phone == customer_phone).first()
        if not customer:
            customer = models.User(
                name="Ahmed Mohamed",
                phone=customer_phone,
                email="customer@example.com",
                password_hash=hash_password("customer123"),
                role="customer"
            )
            db.add(customer)
            print(f"Created Customer account: Phone={customer_phone}")
        else:
            customer.email = "customer@example.com"
            print(f"Customer account verified: {customer_phone}")

        # 3. Seed Services
        services_to_seed = [
            # Small Dogs
            {
                "name": "Shower",
                "pet_type": "dog",
                "pet_size": "small",
                "original_price": 400.0,
                "discounted_price": 200.0,
                "discount_percentage": 50,
                "duration": 45,
                "description": "Full therapeutic bath, blow dry, nail trim & ear cleaning."
            },
            {
                "name": "Cut",
                "pet_type": "dog",
                "pet_size": "small",
                "original_price": 580.0,
                "discounted_price": 290.0,
                "discount_percentage": 50,
                "duration": 60,
                "description": "Styled haircut, blow dry, nail trim & ear cleaning."
            },
            {
                "name": "Shower + Cut",
                "pet_type": "dog",
                "pet_size": "small",
                "original_price": 980.0,
                "discounted_price": 490.0,
                "discount_percentage": 50,
                "duration": 105,
                "description": "Complete full package: therapeutic wash, blow dry, styled cut, nails & ears."
            },

            # Large Dogs
            {
                "name": "Shower",
                "pet_type": "dog",
                "pet_size": "large",
                "original_price": 600.0,
                "discounted_price": 300.0,
                "discount_percentage": 50,
                "duration": 60,
                "description": "Deep therapeutic bath, blow dry, nail trim & ear cleaning."
            },
            {
                "name": "Cut",
                "pet_type": "dog",
                "pet_size": "large",
                "original_price": 700.0,
                "discounted_price": 350.0,
                "discount_percentage": 50,
                "duration": 90,
                "description": "Full coat scissor/clipper haircut, blow dry, nail trim & ears."
            },
            {
                "name": "Shower + Cut",
                "pet_type": "dog",
                "pet_size": "large",
                "original_price": 1300.0,
                "discounted_price": 650.0,
                "discount_percentage": 50,
                "duration": 150,
                "description": "Complete full package: deep wash, blow dry, full styled cut, nails & ears."
            },

            # Cats
            {
                "name": "Shower",
                "pet_type": "cat",
                "pet_size": "any",
                "original_price": 400.0,
                "discounted_price": 200.0,
                "discount_percentage": 50,
                "duration": 45,
                "description": "Gentle sedation-free bath, blow dry, brushing, nails & ears."
            },
            {
                "name": "Cut",
                "pet_type": "cat",
                "pet_size": "any",
                "original_price": 580.0,
                "discounted_price": 290.0,
                "discount_percentage": 50,
                "duration": 60,
                "description": "Gentle sanitary or styled trim, blow dry, nails & ears."
            },
            {
                "name": "Shower + Cut",
                "pet_type": "cat",
                "pet_size": "any",
                "original_price": 980.0,
                "discounted_price": 490.0,
                "discount_percentage": 50,
                "duration": 105,
                "description": "Complete cat grooming: gentle wash, blow dry, styled cut, nails & ears."
            },
        ]

        print("\nSeeding grooming services...")
        for service_data in services_to_seed:
            existing = db.query(models.Service).filter(
                models.Service.name == service_data["name"],
                models.Service.pet_type == service_data["pet_type"],
                models.Service.pet_size == service_data["pet_size"]
            ).first()

            if not existing:
                db_service = models.Service(
                    name=service_data["name"],
                    pet_type=service_data["pet_type"],
                    pet_size=service_data["pet_size"],
                    original_price=service_data["original_price"],
                    discounted_price=service_data["discounted_price"],
                    discount_percentage=service_data["discount_percentage"],
                    duration=service_data["duration"],
                    description=service_data["description"],
                    active=True
                )
                db.add(db_service)
                print(f"Added service: {service_data['name']} for {service_data['pet_type']} ({service_data['pet_size']})")
            else:
                existing.original_price = service_data["original_price"]
                existing.discounted_price = service_data["discounted_price"]
                existing.discount_percentage = service_data["discount_percentage"]
                existing.duration = service_data["duration"]
                existing.description = service_data["description"]
                existing.active = True
                print(f"Updated service: {service_data['name']} for {service_data['pet_type']} ({service_data['pet_size']})")

        db.commit()
        print("\nDatabase seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
