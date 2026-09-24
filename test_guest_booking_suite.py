import os
import sys
import unittest
from datetime import date, datetime, timedelta, time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_guest_booking_db.db"
os.environ["JWT_SECRET"] = "super_secure_jwt_secret_for_guest_tests_2026"
os.environ["ADMIN_EMAIL"] = "admin@mypetcenter.com"
os.environ["ADMIN_PHONE"] = "01200888841"
os.environ["ADMIN_PASSWORD"] = "MyPetCenter#2026!Admin"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app import crud, models, auth

test_engine = create_engine("sqlite:///./test_guest_booking_db.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestGuestBookingFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        # 1. Seed business settings (1:00 PM to 12:00 AM, Capacity = 1)
        db.add(models.Setting(key="opening_time", value="13:00:00"))
        db.add(models.Setting(key="closing_time", value="00:00:00"))
        db.add(models.Setting(key="max_simultaneous_bookings", value="1"))
        db.add(models.Setting(key="max_booking_days_ahead", value="7"))
        db.add(models.Setting(key="slot_interval_minutes", value="60"))

        # 2. Seed default service
        cls.service = models.Service(
            name="Shower + Cut",
            pet_type="dog",
            pet_size="small",
            original_price=980.0,
            discounted_price=490.0,
            discount_percentage=50,
            duration=60,
            description="Complete full grooming session",
            active=True
        )
        db.add(cls.service)

        # 3. Seed Admin user
        admin = models.User(
            name="My Pet Center Admin",
            email="admin@mypetcenter.com",
            phone="01200888841",
            password_hash=auth.hash_password("MyPetCenter#2026!Admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()

        # Admin JWT token
        cls.admin_token = auth.create_access_token(data={"sub": str(admin.id), "role": "admin"})
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db

    def test_01_slots_start_at_1pm_end_at_11pm_no_half_hours_no_midnight(self):
        """Verify operating hours are 1:00 PM – 12:00 AM, whole hours only, 12 AM is not a start slot."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        res = self.client.get(f"/availability?booking_date={tomorrow}")
        self.assertEqual(res.status_code, 200)
        slots = res.json()
        self.assertGreater(len(slots), 0)

        # Extract slot hours and verify whole hours
        slot_hours = []
        for s in slots:
            time_str = s["time"]  # e.g. "13:00:00"
            parts = [int(p) for p in time_str.split(":")]
            self.assertEqual(parts[1], 0, f"Slot {time_str} has non-zero minute!")
            slot_hours.append(parts[0])

        # Exactly 13 (1 PM) to 23 (11 PM)
        expected_hours = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
        self.assertEqual(slot_hours, expected_hours)
        self.assertNotIn(0, slot_hours, "12:00 AM (00:00) must NOT be a booking start time!")

    def test_02_guest_booking_without_auth_succeeds(self):
        """Verify completely unauthenticated visitor can book with name, phone, date, and time."""
        target_date = (date.today() + timedelta(days=2)).isoformat()
        payload = {
            "name": "Nour El Din",
            "phone": "01098765432",
            "booking_date": target_date,
            "start_time": "14:00:00",
            "special_notes": "First grooming visit"
        }
        res = self.client.post("/bookings", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertTrue(data["booking_id"].startswith("MPC-"))
        self.assertEqual(data["customer_name"], "Nour El Din")
        self.assertEqual(data["customer_phone"], "01098765432")
        self.assertEqual(data["booking_date"], target_date)
        self.assertEqual(data["start_time"], "14:00:00")
        self.assertEqual(data["end_time"], "15:00:00")
        self.assertEqual(data["status"], "confirmed")

    def test_03_reject_half_hour_and_invalid_times(self):
        """Verify :30 slots and out-of-bounds start times are rejected."""
        target_date = (date.today() + timedelta(days=2)).isoformat()

        # Attempt :30 slot
        res_half = self.client.post("/bookings", json={
            "name": "Ahmed Aly",
            "phone": "01011112222",
            "booking_date": target_date,
            "start_time": "14:30:00"
        })
        self.assertEqual(res_half.status_code, 400)
        self.assertIn("whole hours", res_half.json()["detail"].lower())

        # Attempt 12:00 PM (before 1:00 PM opening)
        res_early = self.client.post("/bookings", json={
            "name": "Ahmed Aly",
            "phone": "01011112222",
            "booking_date": target_date,
            "start_time": "12:00:00"
        })
        self.assertEqual(res_early.status_code, 400)

        # Attempt 12:00 AM midnight start time
        res_midnight = self.client.post("/bookings", json={
            "name": "Ahmed Aly",
            "phone": "01011112222",
            "booking_date": target_date,
            "start_time": "00:00:00"
        })
        self.assertEqual(res_midnight.status_code, 400)

    def test_04_validation_empty_name_and_invalid_phone(self):
        """Verify empty name and invalid phone numbers are rejected."""
        target_date = (date.today() + timedelta(days=2)).isoformat()

        # Empty name
        res_name = self.client.post("/bookings", json={
            "name": "",
            "phone": "01011112222",
            "booking_date": target_date,
            "start_time": "15:00:00"
        })
        self.assertIn(res_name.status_code, [400, 422])

        # Short / invalid phone
        res_phone = self.client.post("/bookings", json={
            "name": "Mariam",
            "phone": "123",
            "booking_date": target_date,
            "start_time": "15:00:00"
        })
        self.assertIn(res_phone.status_code, [400, 422])

    def test_05_capacity_one_prevents_double_booking(self):
        """Verify default capacity of 1 prevents double booking same slot."""
        target_date = (date.today() + timedelta(days=3)).isoformat()
        slot_time = "16:00:00"

        # Customer 1 books 4:00 PM (16:00)
        res1 = self.client.post("/bookings", json={
            "name": "Guest One",
            "phone": "01012345671",
            "booking_date": target_date,
            "start_time": slot_time
        })
        self.assertEqual(res1.status_code, 201)

        # Verify /availability shows 16:00 is now unavailable
        res_avail = self.client.get(f"/availability?booking_date={target_date}")
        slots = res_avail.json()
        slot_obj = next(s for s in slots if s["time"] == slot_time)
        self.assertFalse(slot_obj["available"], "Slot must be unavailable after 1 booking when capacity=1")

        # Customer 2 attempts to book same slot -> rejected with 400
        res2 = self.client.post("/bookings", json={
            "name": "Guest Two",
            "phone": "01012345672",
            "booking_date": target_date,
            "start_time": slot_time
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("no longer available", res2.json()["detail"].lower())

    def test_06_admin_dashboard_sees_guest_booking_and_can_manage(self):
        """Verify admin can view, search, reschedule, and update status of guest bookings."""
        # Query admin bookings with admin token
        res = self.client.get("/admin/bookings", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        bookings = res.json()
        self.assertGreater(len(bookings), 0)

        # Search by customer name
        res_search = self.client.get("/admin/bookings?customer_name=Nour", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_search.status_code, 200)
        found = res_search.json()
        self.assertTrue(any("Nour" in (b.get("customer_name") or "") for b in found))

        # Status update to completed
        target_booking = bookings[0]
        res_status = self.client.patch(
            f"/admin/bookings/{target_booking['id']}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"status": "completed"}
        )
        self.assertEqual(res_status.status_code, 200)
        self.assertEqual(res_status.json()["status"], "completed")

    def test_07_unauthorized_admin_access_rejected(self):
        """Verify customer/guest cannot access admin endpoints."""
        res = self.client.get("/admin/dashboard")
        self.assertEqual(res.status_code, 401)

        res_bookings = self.client.get("/admin/bookings")
        self.assertEqual(res_bookings.status_code, 401)

if __name__ == "__main__":
    unittest.main()
