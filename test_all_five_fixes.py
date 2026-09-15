import os
import sys
from datetime import date, time, timedelta

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

from backend.app.database import SessionLocal
from backend.app import crud, schemas, models
from fastapi.testclient import TestClient
from backend.app.main import app

def test_everything():
    db = SessionLocal()
    client = TestClient(app)

    try:
        print("\n========================================================")
        print("RUNNING COMPREHENSIVE TESTS FOR ALL 5 REPORTED ISSUES")
        print("========================================================")

        # ----------------------------------------------------
        # TEST 1: ASSETS & LOGO VERIFICATION
        # ----------------------------------------------------
        print("\n1. Verifying Logo, Favicon, and Storefront Photo Assets...")
        public_logo = os.path.join(ROOT_DIR, "frontend", "public", "logo.png")
        public_fav = os.path.join(ROOT_DIR, "frontend", "public", "favicon.png")
        public_store = os.path.join(ROOT_DIR, "frontend", "public", "store.jpg")
        src_logo = os.path.join(ROOT_DIR, "frontend", "src", "assets", "logo.png")
        src_store = os.path.join(ROOT_DIR, "frontend", "src", "assets", "store.jpg")

        for p in [public_logo, public_fav, public_store, src_logo, src_store]:
            assert os.path.exists(p), f"Asset missing: {p}"
            size_kb = os.path.getsize(p) / 1024
            assert size_kb > 10, f"Asset too small or corrupted: {p} ({size_kb:.1f} KB)"
            print(f"   [OK] Asset verified: {os.path.basename(p)} ({size_kb:.1f} KB)")

        # ----------------------------------------------------
        # TEST 2: AVAILABILITY LOGIC ON EMPTY DAY
        # ----------------------------------------------------
        print("\n2. Testing Availability on a Clean / Empty Day...")
        test_empty_date = date.today() + timedelta(days=6)
        # Clear any existing test bookings on test_empty_date
        db.query(models.Booking).filter(models.Booking.booking_date == test_empty_date).delete()
        db.commit()

        slots_empty = crud.get_available_slots(db, test_empty_date)
        assert len(slots_empty) > 0, "Empty day returned no slots!"
        all_avail = all(s.available for s in slots_empty)
        assert all_avail, f"Expected all {len(slots_empty)} slots to be available on an empty day!"
        print(f"   [OK] Empty day ({test_empty_date}): All {len(slots_empty)} slots are AVAILABLE (3:00 PM - 12:00 AM).")

        # ----------------------------------------------------
        # TEST 3: CAPACITY CHECK WITH DEFAULT CAPACITY = 1
        # ----------------------------------------------------
        print("\n3. Testing Capacity Rules (Default 1 booking per slot)...")
        test_cap_date = date.today() + timedelta(days=4)
        db.query(models.Booking).filter(models.Booking.booking_date == test_cap_date).delete()
        db.commit()

        user = crud.get_user_by_phone(db, "01234567890")
        admin = crud.get_user_by_identifier(db, "admin@mypetcenter.com")

        # Step 3a: Create 1st booking at 16:00 (duration: 60m -> 16:00 to 17:00)
        b1 = crud.create_booking(
            db, user,
            schemas.BookingCreate(
                booking_date=test_cap_date,
                start_time=time(16, 0),
                special_notes="Test booking 1"
            )
        )
        # Query availability - slot 16:00 must now be UNAVAILABLE (capacity is 1/1)
        slots_after_1 = crud.get_available_slots(db, test_cap_date)
        slot_16_after_1 = [s for s in slots_after_1 if s.time == time(16, 0)][0]
        assert slot_16_after_1.available == False, "Slot 16:00 should be unavailable with 1 booking when capacity=1!"
        
        # Slots at 17:00 should still be AVAILABLE
        slot_17_after_1 = [s for s in slots_after_1 if s.time == time(17, 0)][0]
        assert slot_17_after_1.available == True, "Slot 17:00 should be AVAILABLE!"
        print(f"   [OK] After 1 booking at 16:00: Slot 16:00 is UNAVAILABLE (Capacity 1/1), 17:00 is AVAILABLE.")

        # Step 3b: Attempting 2nd booking at 16:00 must raise ValueError under capacity=1
        try:
            crud.create_booking(
                db, user,
                schemas.BookingCreate(
                    booking_date=test_cap_date,
                    start_time=time(16, 0),
                    special_notes="Test booking 2"
                )
            )
            assert False, "Backend failed to reject 2nd overlapping booking under capacity=1!"
        except ValueError as e:
            print(f"   [OK] 2nd overlapping booking correctly REJECTED by backend: '{e}'")

        # ----------------------------------------------------
        # TEST 4: DURATION-AWARE AVAILABILITY
        # ----------------------------------------------------
        print("\n4. Testing Service Duration in Availability Calculation...")
        # Query Shower + Cut for large dog (duration: 150 minutes = 2.5 hours)
        large_dog_service = db.query(models.Service).filter(
            models.Service.name == "Shower + Cut",
            models.Service.pet_type == "dog",
            models.Service.pet_size == "large"
        ).first()
        slots_150m = crud.get_available_slots(db, test_empty_date, service_id=large_dog_service.id)
        # At 150m duration with 60m interval, last whole-hour slot before 00:00 midnight is 21:00 (21:00 + 2h30m = 23:30 <= 00:00)
        last_slot = slots_150m[-1]
        assert last_slot.time == time(21, 0), f"Expected last whole-hour slot at 21:00 for 150m service, got {last_slot.time}"
        print(f"   [OK] 150m duration correctly calculates last available whole-hour slot at {last_slot.time}.")

        # ----------------------------------------------------
        # TEST 5: ADMIN AUTHENTICATION & ROLE AUTHORIZATION
        # ----------------------------------------------------
        print("\n5. Testing Admin vs Customer Authentication & Role Protection...")
        
        # 5a. Admin login via /auth/admin-login
        from backend.app.config import settings
        admin_res = client.post("/auth/admin-login", json={"email": "admin@mypetcenter.com", "password": settings.ADMIN_PASSWORD})
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        admin_data = admin_res.json()
        assert admin_data["user"]["role"] == "admin", f"Expected admin role, got {admin_data['user']['role']}"
        admin_token = admin_data["access_token"]
        print(f"   [OK] Admin login OK: Role='{admin_data['user']['role']}', Name='{admin_data['user']['name']}'")

        # 5b. Admin access to /admin/dashboard
        dash_res = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        assert dash_res.status_code == 200, f"Admin dashboard access failed: {dash_res.text}"
        dash_data = dash_res.json()
        print(f"   [OK] Admin Dashboard accessed OK (Today bookings: {dash_data['today_count']}, Upcoming: {dash_data['upcoming_count']})")

        # 5c. Customer login via /auth/login
        cust_res = client.post("/auth/login", json={"phone": "01234567890", "password": "customer123"})
        assert cust_res.status_code == 200, f"Customer login failed: {cust_res.text}"
        cust_data = cust_res.json()
        assert cust_data["user"]["role"] == "customer", f"Expected customer role, got {cust_data['user']['role']}"
        cust_token = cust_data["access_token"]
        print(f"   [OK] Customer login OK: Role='{cust_data['user']['role']}', Name='{cust_data['user']['name']}'")

        # 5d. Customer blocked from /auth/admin-login (403 Forbidden)
        cust_admin_login_res = client.post("/auth/admin-login", json={"email": "01234567890", "password": "customer123"})
        assert cust_admin_login_res.status_code == 403, f"Expected 403, got {cust_admin_login_res.status_code}"
        print(f"   [OK] Customer strictly BLOCKED from /auth/admin-login (HTTP 403 Forbidden).")

        # 5e. Customer blocked from /admin/dashboard (403 Forbidden)
        cust_dash_res = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {cust_token}"})
        assert cust_dash_res.status_code == 403, f"Expected 403, got {cust_dash_res.status_code}"
        print(f"   [OK] Customer strictly BLOCKED from /admin/dashboard (HTTP 403 Forbidden).")

        print("\n========================================================")
        print("ALL 5 ISSUES FULLY RESOLVED AND VERIFIED PERFECTLY!")
        print("========================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    test_everything()
