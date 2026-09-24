import os
import sys
import unittest
import threading
from datetime import date, datetime, timedelta, time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_booking_db.db"
os.environ["JWT_SECRET"] = "super_secure_jwt_secret_for_booking_tests_2026"
os.environ["ADMIN_EMAIL"] = "admin@mypetcenter.com"
os.environ["ADMIN_PHONE"] = "01200888841"
os.environ["ADMIN_PASSWORD"] = "MyPetCenter#2026!Admin"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app import crud, models, auth

test_engine = create_engine("sqlite:///./test_booking_db.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestBookingAndCapacityRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        # 1. Seed business settings (Capacity = 1 default, 1:00 PM to 12:00 AM, 5-day advance window)
        db.add(models.Setting(key="opening_time", value="13:00:00"))
        db.add(models.Setting(key="closing_time", value="00:00:00"))
        db.add(models.Setting(key="max_simultaneous_bookings", value="1"))
        db.add(models.Setting(key="max_booking_days_ahead", value="5"))
        db.add(models.Setting(key="slot_interval_minutes", value="60"))

        # 2. Seed services
        cls.service = models.Service(
            name="Shower + Cut",
            pet_type="dog",
            pet_size="small",
            original_price=980.0,
            discounted_price=490.0,
            discount_percentage=50,
            duration=60,
            description="Complete full package",
            active=True
        )
        db.add(cls.service)

        # 3. Seed Admin
        admin = models.User(
            name="Admin Staff",
            email="admin@mypetcenter.com",
            phone="01200888841",
            password_hash=auth.hash_password("MyPetCenter#2026!Admin"),
            role="admin"
        )
        db.add(admin)

        # 4. Seed 2 Customer Accounts
        cls.cust1 = models.User(
            name="Customer One",
            email="cust1@example.com",
            phone="01011112222",
            password_hash=auth.hash_password("cust1pass"),
            role="customer"
        )
        cls.cust2 = models.User(
            name="Customer Two",
            email="cust2@example.com",
            phone="01033334444",
            password_hash=auth.hash_password("cust2pass"),
            role="customer"
        )
        cls.cust3 = models.User(
            name="Customer Three",
            email="cust3@example.com",
            phone="01055556666",
            password_hash=auth.hash_password("cust3pass"),
            role="customer"
        )
        db.add_all([cls.cust1, cls.cust2, cls.cust3])
        db.commit()

        # Generate JWT tokens
        cls.admin_token = auth.create_access_token(data={"sub": str(admin.id), "role": "admin"})
        cls.cust1_token = auth.create_access_token(data={"sub": str(cls.cust1.id), "role": "customer"})
        cls.cust2_token = auth.create_access_token(data={"sub": str(cls.cust2.id), "role": "customer"})
        cls.cust3_token = auth.create_access_token(data={"sub": str(cls.cust3.id), "role": "customer"})
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db

    def test_01_whole_hour_slots_only(self):
        """Test availability endpoint returns only whole-hour slots (13:00 to 23:00) with zero :30 slots."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        res = self.client.get(f"/availability?booking_date={tomorrow}")
        self.assertEqual(res.status_code, 200)
        slots = res.json()
        self.assertGreater(len(slots), 0)

        # Check every slot time
        for s in slots:
            time_str = s["time"]  # e.g. "13:00:00"
            parts = time_str.split(":")
            minute = int(parts[1])
            self.assertEqual(minute, 0, f"Slot {time_str} is not a whole-hour slot!")

        # Verify exact hours generated: 13:00, 14:00, 15:00, 16:00, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00, 23:00
        slot_hours = [int(s["time"].split(":")[0]) for s in slots]
        self.assertIn(13, slot_hours, "1:00 PM slot must be present.")
        self.assertIn(23, slot_hours, "11:00 PM slot must be present.")
        self.assertNotIn(12, slot_hours, "12:00 PM is before grooming opening (1 PM).")
        self.assertNotIn(0, slot_hours, "12:00 AM start slot must NOT be present as service extends past closing.")

    def test_02_backend_rejects_half_hour_slots(self):
        """Test backend strictly rejects any :30 booking time with 400 Bad Request."""
        target_date = (date.today() + timedelta(days=2)).isoformat()
        res = self.client.post("/bookings",
            json={
                "name": "Customer One",
                "phone": "01011112222",
                "booking_date": target_date,
                "start_time": "15:30:00",
                "special_notes": "Attempting half-hour slot"
            }
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("whole hours", res.json()["detail"].lower())

    def test_03_backend_rejects_out_of_bounds_times(self):
        """Test backend rejects times outside operating hours and dates past 5 days."""
        target_date = (date.today() + timedelta(days=2)).isoformat()
        
        # 12:00 PM (12:00) before 1:00 PM opening
        res_early = self.client.post("/bookings",
            json={"name": "Customer One", "phone": "01011112222", "booking_date": target_date, "start_time": "12:00:00"}
        )
        self.assertEqual(res_early.status_code, 400)

        # 6 days in the future (beyond 5 days limit)
        beyond_date = (date.today() + timedelta(days=6)).isoformat()
        res_late_date = self.client.post("/bookings",
            json={"name": "Customer One", "phone": "01011112222", "booking_date": beyond_date, "start_time": "16:00:00"}
        )
        self.assertEqual(res_late_date.status_code, 400)
        self.assertIn("days in advance", res_late_date.json()["detail"].lower())

    def test_04_guest_booking_validation(self):
        """Test missing name/phone is rejected."""
        target_date = (date.today() + timedelta(days=2)).isoformat()
        res = self.client.post("/bookings", json={
            "name": "",
            "phone": "01011112222",
            "booking_date": target_date,
            "start_time": "16:00:00"
        })
        self.assertIn(res.status_code, [400, 422])

    def test_05_capacity_one_enforcement(self):
        """
        Test Capacity = 1 Rule:
        1. Customer 1 books 17:00 -> succeeds.
        2. Slot 17:00 becomes unavailable in /availability.
        3. Customer 2 attempts to book 17:00 -> rejected with 400 Bad Request.
        """
        target_date = (date.today() + timedelta(days=3)).isoformat()
        target_time = "17:00:00"

        # Customer 1 books
        res1 = self.client.post("/bookings",
            json={"name": "Customer One", "phone": "01011112222", "booking_date": target_date, "start_time": target_time}
        )
        self.assertEqual(res1.status_code, 201)
        booking1 = res1.json()
        self.assertTrue(booking1["booking_id"].startswith("MPC-"))

        # Check availability: 17:00 is now unavailable
        res_avail = self.client.get(f"/availability?booking_date={target_date}")
        slots = res_avail.json()
        slot_17 = next(s for s in slots if s["time"] == target_time)
        self.assertFalse(slot_17["available"], "Slot must be unavailable after 1 booking when capacity=1")

        # Customer 2 attempts to book same slot -> rejected
        res2 = self.client.post("/bookings",
            json={"name": "Customer Two", "phone": "01033334444", "booking_date": target_date, "start_time": target_time}
        )
        self.assertEqual(res2.status_code, 400)
        self.assertIn("no longer available", res2.json()["detail"].lower())

    def test_06_admin_dynamic_capacity_change(self):
        """
        Test Admin dynamic capacity change:
        1. Admin changes capacity from 1 to 2.
        2. Slot 17:00 (which had 1 booking) is now available again.
        3. Customer 2 books 17:00 -> succeeds.
        4. Slot 17:00 is now full (2/2) -> unavailable.
        5. Customer 3 attempts to book 17:00 -> rejected.
        6. Admin changes capacity back to 1.
        """
        target_date = (date.today() + timedelta(days=3)).isoformat()
        target_time = "17:00:00"

        # Admin changes capacity to 2
        res_set = self.client.patch("/admin/settings/max_simultaneous_bookings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "2"}
        )
        self.assertEqual(res_set.status_code, 200)

        # Slot 17:00 is now available again
        res_avail = self.client.get(f"/availability?booking_date={target_date}")
        slot_17 = next(s for s in res_avail.json() if s["time"] == target_time)
        self.assertTrue(slot_17["available"], "Slot should be available after capacity increased to 2.")

        # Customer 2 books
        res2 = self.client.post("/bookings",
            json={"name": "Customer Two", "phone": "01033334444", "booking_date": target_date, "start_time": target_time}
        )
        self.assertEqual(res2.status_code, 201)

        # Slot 17:00 is now 2/2 full -> unavailable
        res_avail2 = self.client.get(f"/availability?booking_date={target_date}")
        slot_17_full = next(s for s in res_avail2.json() if s["time"] == target_time)
        self.assertFalse(slot_17_full["available"])

        # Customer 3 attempts to book -> rejected
        res3 = self.client.post("/bookings",
            json={"name": "Customer Three", "phone": "01055556666", "booking_date": target_date, "start_time": target_time}
        )
        self.assertEqual(res3.status_code, 400)

        # Admin changes capacity back to 1
        res_back = self.client.patch("/admin/settings/max_simultaneous_bookings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "1"}
        )
        self.assertEqual(res_back.status_code, 200)

    def test_07_concurrent_booking_race_condition(self):
        """Test concurrent booking attempts on the same slot: exactly 1 succeeds when capacity=1."""
        target_date = (date.today() + timedelta(days=4)).isoformat()
        target_time = "18:00:00"

        results = []

        def attempt_book(name, phone):
            client = TestClient(app)
            r = client.post("/bookings",
                json={"name": name, "phone": phone, "booking_date": target_date, "start_time": target_time}
            )
            results.append(r.status_code)

        t1 = threading.Thread(target=attempt_book, args=("Concurrent 1", "01011110001"))
        t2 = threading.Thread(target=attempt_book, args=("Concurrent 2", "01011110002"))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        success_count = results.count(201)
        fail_count = results.count(400)

        self.assertEqual(success_count, 1, f"Exactly 1 booking must succeed under capacity=1. Results: {results}")
        self.assertEqual(fail_count, 1, f"Exactly 1 booking must be rejected. Results: {results}")

    def test_08_customer_my_bookings(self):
        """Test customer can view their bookings with ID, date, time, and status."""
        res = self.client.get("/bookings/my/all", headers={"Authorization": f"Bearer {self.cust1_token}"})
        self.assertEqual(res.status_code, 200)
        my_list = res.json()
        self.assertGreaterEqual(len(my_list), 1)
        for b in my_list:
            self.assertIn("booking_id", b)
            self.assertIn("booking_date", b)
            self.assertIn("start_time", b)
            self.assertIn("status", b)

if __name__ == "__main__":
    unittest.main()
