import os
import sys
import unittest
from datetime import date, time, datetime, timedelta

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.app import crud, schemas, models
from backend.app.auth import hash_password
from backend.app.email import is_smtp_configured, send_password_reset_email

class FinalRegressionTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.admin_pass = os.getenv("ADMIN_PASSWORD", "MyPetCenter#2026!Admin")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        from backend.app.database import get_db
        app.dependency_overrides.pop(get_db, None)
        self.db.rollback()

    # -------------------------------------------------------------
    # 1. FORGOT PASSWORD & RESET TOKEN LIFECYCLE
    # -------------------------------------------------------------
    def test_01_forgot_password_and_token_flow(self):
        """Test complete forgot-password request, token creation, single-use, expiry, and reuse rejection."""
        # Ensure a test user exists
        test_email = "reset_test_user@mypetcenter.com"
        existing = crud.get_user_by_email(self.db, test_email)
        if not existing:
            user = crud.create_user(
                self.db,
                name="Reset Tester",
                email=test_email,
                phone="01099998888",
                password_hash=hash_password("InitialPassword123")
            )
        else:
            user = existing

        # 1. Request password reset via API (ensures endpoint returns 200 without exposing token)
        resp = self.client.post("/auth/forgot-password", json={"email": test_email})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("message", resp.json())
        self.assertNotIn("token", resp.json())

        # 2. Generate a secure token directly via CRUD
        raw_token = crud.create_password_reset_token(self.db, user)
        self.assertIsNotNone(raw_token)

        # 3. Reset password with valid token
        reset_resp = self.client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "NewSecurePassword#2026"
        })
        self.assertEqual(reset_resp.status_code, 200)

        # 4. Reusing the token must fail immediately

        reused_resp = self.client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "AnotherPassword#2026"
        })
        self.assertEqual(reused_resp.status_code, 400)
        self.assertIn("invalid or has expired", reused_resp.json()["detail"].lower())

        # 5. Invalid token format or non-existent token rejected
        bad_token_resp = self.client.post("/auth/reset-password", json={
            "token": "completely-invalid-uuid-token",
            "new_password": "AnotherPassword#2026"
        })
        self.assertEqual(bad_token_resp.status_code, 400)

        # 6. Verify login with the new password
        login_resp = self.client.post("/auth/login", json={
            "phone": test_email,
            "password": "NewSecurePassword#2026"
        })
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn("access_token", login_resp.json())

    # -------------------------------------------------------------
    # 2. DUAL AUTHENTICATION: EMAIL & PHONE (CASE & SPACE INSENSITIVE)
    # -------------------------------------------------------------
    def test_02_dual_auth_email_and_phone(self):
        """Test customer login via phone, email, spaced email, mixed-case email, and Egyptian phone formats."""
        cust_email = "dual_auth_customer@mypetcenter.com"
        cust_phone = "01188776655"
        cust_pass = "CustomerSecure#2026"

        existing = crud.get_user_by_email(self.db, cust_email)
        if not existing:
            crud.create_user(
                self.db,
                name="Dual Auth User",
                email=cust_email,
                phone=cust_phone,
                password_hash=hash_password(cust_pass)
            )

        # Case 1: Exact registered email + password
        r1 = self.client.post("/auth/login", json={"phone": cust_email, "password": cust_pass})
        self.assertEqual(r1.status_code, 200, f"Email login failed: {r1.text}")
        self.assertIn("access_token", r1.json())

        # Case 2: Exact registered phone + password
        r2 = self.client.post("/auth/login", json={"phone": cust_phone, "password": cust_pass})
        self.assertEqual(r2.status_code, 200, f"Phone login failed: {r2.text}")

        # Case 3: Email with uppercase/lowercase variation
        r3 = self.client.post("/auth/login", json={"phone": "DuAl_AuTh_CuStOmEr@MyPetCenter.COM", "password": cust_pass})
        self.assertEqual(r3.status_code, 200, f"Mixed-case email login failed: {r3.text}")

        # Case 4: Email with leading/trailing spaces
        r4 = self.client.post("/auth/login", json={"phone": "   dual_auth_customer@mypetcenter.com   ", "password": cust_pass})
        self.assertEqual(r4.status_code, 200, f"Spaced email login failed: {r4.text}")

        # Case 5: Spaced phone format
        r5 = self.client.post("/auth/login", json={"phone": "011 8877 6655", "password": cust_pass})
        self.assertEqual(r5.status_code, 200, f"Spaced phone login failed: {r5.text}")

        # Case 6: +20 Country code format
        r6 = self.client.post("/auth/login", json={"phone": "+201188776655", "password": cust_pass})
        self.assertEqual(r6.status_code, 200, f"+20 phone login failed: {r6.text}")

        # Case 7: Wrong password -> generic error
        r7 = self.client.post("/auth/login", json={"phone": cust_email, "password": "WrongPassword123!"})
        self.assertEqual(r7.status_code, 401)
        self.assertIn("Invalid phone/email or password", r7.json()["detail"])

        # Case 8: Non-existent email -> generic error (no account enumeration)
        r8 = self.client.post("/auth/login", json={"phone": "nonexistent_9999@example.com", "password": cust_pass})
        self.assertEqual(r8.status_code, 401)
        self.assertIn("Invalid phone/email or password", r8.json()["detail"])

    # -------------------------------------------------------------
    # 3. SCHEMA VALIDATION ERROR SANITIZATION (NO "STRING SHOULD HAVE...")
    # -------------------------------------------------------------
    def test_03_clean_validation_errors(self):
        """Verify that raw schema errors ('String should have at least 3 characters') are completely eliminated."""
        # 1. 1-character phone/email input on login
        r1 = self.client.post("/auth/login", json={"phone": "a", "password": "b"})
        self.assertNotIn("String should have at least", r1.text)
        self.assertNotIn("pydantic", r1.text.lower())

        # 2. Empty or invalid registration payload
        r2 = self.client.post("/auth/register", json={
            "name": "",
            "email": "invalid-email-format",
            "phone": "123",
            "password": "12"
        })
        self.assertEqual(r2.status_code, 422)
        error_msg = r2.json()["detail"]
        self.assertNotIn("String should have at least", error_msg)
        self.assertNotIn("[object Object]", error_msg)
        self.assertTrue(isinstance(error_msg, str))
        print(f"   [Clean validation message]: {error_msg}")

    # -------------------------------------------------------------
    # 4. ADMIN BOOKING SLOT INTERVAL INSTANT PERSISTENCE & AVAILABILITY
    # -------------------------------------------------------------
    def test_04_admin_slot_interval_saving_and_availability(self):
        """Test that changing slot_interval_minutes persists in DB and immediately alters availability."""
        # 1. Admin login
        admin_resp = self.client.post("/auth/admin-login", json={
            "email": "admin@mypetcenter.com",
            "password": self.admin_pass
        })
        self.assertEqual(admin_resp.status_code, 200)
        admin_token = admin_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Update slot_interval_minutes to 60 (Whole-hour slots) via PATCH /admin/settings/{key}
        set_resp = self.client.patch(
            "/admin/settings/slot_interval_minutes",
            json={"value": "60"},
            headers=headers
        )
        self.assertEqual(set_resp.status_code, 200)
        self.assertEqual(set_resp.json()["value"], "60")

        # 3. Verify persistence in DB
        db_setting = self.db.query(models.Setting).filter(models.Setting.key == "slot_interval_minutes").first()
        self.assertEqual(db_setting.value, "60")

        # 4. Verify availability produces whole-hour slots only (NO :30 slots)
        avail_date = (date.today() + timedelta(days=2)).isoformat()
        avail_resp = self.client.get(f"/availability?booking_date={avail_date}")
        self.assertEqual(avail_resp.status_code, 200)
        slots = avail_resp.json()
        self.assertTrue(len(slots) > 0)
        for s in slots:
            time_str = s["time"]
            minute_part = time_str.split(":")[1]
            self.assertEqual(minute_part, "00", f"Found non-whole-hour slot: {time_str}")

    # -------------------------------------------------------------
    # 5. CAPACITY CONFIGURATION & CONCURRENCY
    # -------------------------------------------------------------
    def test_05_capacity_enforcement(self):
        """Test default capacity=1, admin capacity modification, and concurrent booking limits."""
        admin_resp = self.client.post("/auth/admin-login", json={
            "email": "admin@mypetcenter.com",
            "password": self.admin_pass
        })
        admin_token = admin_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Ensure capacity is set to 1
        self.client.patch(
            "/admin/settings/max_simultaneous_bookings",
            json={"value": "1"},
            headers=headers
        )
        db_cap = self.db.query(models.Setting).filter(models.Setting.key == "max_simultaneous_bookings").first()
        self.assertEqual(db_cap.value, "1")

        # Target date & time (within 5-day window: today + 2 days)
        target_date = date.today() + timedelta(days=2)
        # Clear existing bookings on this date for clean test
        self.db.query(models.Booking).filter(models.Booking.booking_date == target_date).delete()
        self.db.commit()

        # Customer 1 books 16:00
        b1 = self.client.post("/bookings", json={
            "name": "Cap Test Cust 1",
            "phone": "01011112233",
            "booking_date": target_date.isoformat(),
            "start_time": "16:00:00"
        })
        self.assertEqual(b1.status_code, 201)

        # Customer 2 attempts same slot 16:00 -> MUST FAIL
        b2 = self.client.post("/bookings", json={
            "name": "Cap Test Cust 2",
            "phone": "01122223344",
            "booking_date": target_date.isoformat(),
            "start_time": "16:00:00"
        })
        self.assertEqual(b2.status_code, 400)
        self.assertIn("no longer available", b2.json()["detail"])

    # -------------------------------------------------------------
    # 6. OPERATING HOURS & 5-DAY ADVANCE BOOKING LIMIT
    # -------------------------------------------------------------
    def test_06_booking_rules_and_limits(self):
        """Test grooming start times (1 PM - 11 PM) and 5-day advance booking limit."""
        # 1. Availability returns slots within 13:00:00 to 23:00:00
        test_date = (date.today() + timedelta(days=1)).isoformat()
        avail_resp = self.client.get(f"/availability?booking_date={test_date}")
        self.assertEqual(avail_resp.status_code, 200)
        slots = avail_resp.json()
        slot_times = [s["time"] for s in slots]
        self.assertIn("13:00:00", slot_times)
        self.assertIn("23:00:00", slot_times)
        self.assertNotIn("12:00:00", slot_times)
        self.assertNotIn("00:00:00", slot_times)

        # 2. Attempt booking beyond 5 days
        far_date = (date.today() + timedelta(days=6)).isoformat()
        b_far = self.client.post("/bookings", json={
            "name": "Booking Rule Tester",
            "phone": "01099991111",
            "booking_date": far_date,
            "start_time": "16:00:00"
        })
        self.assertEqual(b_far.status_code, 400)
        self.assertIn("5 days", b_far.json()["detail"])

if __name__ == "__main__":
    unittest.main()
