import os
import sys
from datetime import date, time, timedelta

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

from backend.app.database import SessionLocal
from backend.app import crud, schemas, models
from backend.app.auth import hash_password, verify_password, create_access_token

def test_corrections():
    db = SessionLocal()
    try:
        print("1. Checking services list...")
        services = crud.get_services(db, active_only=True)
        assert len(services) == 9, f"Expected 9 services, got {len(services)}"
        
        # Print services
        for s in services:
            print(f"   [{s.pet_type.upper()} {s.pet_size}] {s.name}: {s.discounted_price} EGP (Orig: {s.original_price} EGP, Duration: {s.duration}m)")

        user = crud.get_user_by_phone(db, "01234567890")
        admin = crud.get_user_by_identifier(db, "admin@mypetcenter.com")
        target_date = date.today() + timedelta(days=3)

        # Clean previous test bookings on target_date
        db.query(models.Booking).filter(models.Booking.booking_date == target_date).delete()
        db.commit()

        # 2. Test Small Dog Shower + Cut (490 EGP)
        small_dog_both = [s for s in services if s.name == "Shower + Cut" and s.pet_type == "dog" and s.pet_size == "small"][0]
        booking_sd = crud.create_booking(
            db, user,
            schemas.BookingCreate(
                pet_type="dog",
                pet_breed="Jack Russell",
                pet_size="small",
                service_id=small_dog_both.id,
                booking_date=target_date,
                start_time=time(15, 0),
                special_notes="Both shower and cut"
            )
        )
        assert booking_sd.price == 490.0, f"Expected 490 EGP, got {booking_sd.price}"
        print(f"\n2. Small Dog Shower + Cut OK: {booking_sd.booking_id} -> {booking_sd.price} EGP")

        # 3. Test Large Dog Shower + Cut (650 EGP)
        large_dog_both = [s for s in services if s.name == "Shower + Cut" and s.pet_type == "dog" and s.pet_size == "large"][0]
        booking_ld = crud.create_booking(
            db, user,
            schemas.BookingCreate(
                pet_type="dog",
                pet_breed="German Shepherd",
                pet_size="large",
                service_id=large_dog_both.id,
                booking_date=target_date,
                start_time=time(17, 0),
                special_notes="Large dog both"
            )
        )
        assert booking_ld.price == 650.0, f"Expected 650 EGP, got {booking_ld.price}"
        print(f"3. Large Dog Shower + Cut OK: {booking_ld.booking_id} -> {booking_ld.price} EGP")

        # 4. Test Cat Shower + Cut (490 EGP) on another non-overlapping slot (20:00)
        cat_both = [s for s in services if s.name == "Shower + Cut" and s.pet_type == "cat"][0]
        booking_cat = crud.create_booking(
            db, user,
            schemas.BookingCreate(
                pet_type="cat",
                pet_breed=None,
                pet_size=None,
                service_id=cat_both.id,
                booking_date=target_date,
                start_time=time(20, 0),
                special_notes="Cat both"
            )
        )
        assert booking_cat.price == 490.0, f"Expected 490 EGP, got {booking_cat.price}"
        print(f"4. Cat Shower + Cut OK: {booking_cat.booking_id} -> {booking_cat.price} EGP")

        # 5. Test Admin Block Slot at 22:00
        block = crud.block_admin_slot(
            db,
            admin_user=admin,
            booking_date=target_date,
            start_time=time(22, 0),
            duration=60,
            reason="Sanitization maintenance"
        )
        assert block.status == "blocked"
        print(f"5. Admin Block Slot OK: {block.booking_id} at {block.start_time}")

        # 6. Verify that slot at 22:00 is now at max capacity (1 admin block = capacity 1)
        try:
            crud.create_booking(
                db, user,
                schemas.BookingCreate(
                    pet_type="cat",
                    pet_breed=None,
                    pet_size=None,
                    service_id=cat_both.id,
                    booking_date=target_date,
                    start_time=time(22, 0)
                )
            )
            assert False, "Expected ValueError for booked/blocked slot"
        except ValueError as e:
            print(f"6. Capacity constraint verified: {e}")

        # 6b. Test Streamlined Fast Customer Booking (Only Date & Time, default pet/service)
        # Note: 23:00 has 60m remaining before 24:00 closing time
        streamlined_service = [s for s in services if s.duration <= 60][0]
        streamlined_booking = crud.create_booking(
            db, user,
            schemas.BookingCreate(
                service_id=streamlined_service.id,
                booking_date=target_date,
                start_time=time(23, 0),
                special_notes="Fast single-page booking test"
            )
        )
        assert streamlined_booking.booking_id.startswith("MPC-")
        print(f"6b. Streamlined fast customer booking OK: {streamlined_booking.booking_id} at {streamlined_booking.start_time}")

        # 7. Test Admin Login & Role Protection with FastAPI TestClient
        from fastapi.testclient import TestClient
        from backend.app.main import app
        
        client = TestClient(app)

        # Admin login via /auth/admin-login
        admin_pass = os.getenv("ADMIN_PASSWORD", "MyPetCenter#2026!Admin")
        admin_resp = client.post("/auth/admin-login", json={"email": "admin@mypetcenter.com", "password": admin_pass})
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        admin_token = admin_resp.json()["access_token"]
        print("7. Admin login with email OK (token received).")

        # Customer login via /auth/login
        cust_resp = client.post("/auth/login", json={"phone": "01234567890", "password": "customer123"})
        assert cust_resp.status_code == 200, f"Customer login failed: {cust_resp.text}"
        cust_token = cust_resp.json()["access_token"]
        print("8. Customer login with phone OK.")

        # Customer tries /auth/admin-login -> should fail with 403
        bad_admin_resp = client.post("/auth/admin-login", json={"email": "01234567890", "password": "customer123"})
        assert bad_admin_resp.status_code == 403, f"Expected 403 for customer on admin login, got {bad_admin_resp.status_code}"
        print("9. Customer blocked from /auth/admin-login with 403 Forbidden OK.")

        # Customer tries /admin/dashboard -> should fail with 403
        bad_dash = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {cust_token}"})
        assert bad_dash.status_code == 403, f"Expected 403 for customer on /admin/dashboard, got {bad_dash.status_code}"
        print("10. Customer blocked from /admin/dashboard with 403 Forbidden OK.")

        # Admin accesses /admin/dashboard -> should succeed with 200
        good_dash = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        assert good_dash.status_code == 200, f"Admin dashboard failed: {good_dash.text}"
        print("11. Admin access to /admin/dashboard OK.")

        print("\n========================================================")
        print("ALL BACKEND & ROLE PROTECTION TESTS PASSED PERFECTLY!")
        print("========================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_corrections()
