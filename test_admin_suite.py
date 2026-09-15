import os
import sys
import unittest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_admin_db.db"
os.environ["JWT_SECRET"] = "super_secure_jwt_secret_for_admin_tests_2026"
os.environ["ADMIN_EMAIL"] = "admin@mypetcenter.com"
os.environ["ADMIN_PHONE"] = "01200888841"
os.environ["ADMIN_PASSWORD"] = "MyPetCenter#2026!Admin"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app import crud, models, schemas, auth

test_engine = create_engine("sqlite:///./test_admin_db.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestAdminDashboardAndRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        # Seed settings
        db.add(models.Setting(key="opening_time", value="15:00:00"))
        db.add(models.Setting(key="closing_time", value="00:00:00"))
        db.add(models.Setting(key="max_simultaneous_bookings", value="1"))
        db.add(models.Setting(key="max_booking_days_ahead", value="7"))
        db.add(models.Setting(key="slot_interval_minutes", value="60"))

        # Seed service
        service = models.Service(
            name="Shower",
            pet_type="dog",
            pet_size="small",
            original_price=400.0,
            discounted_price=200.0,
            discount_percentage=50,
            duration=60,
            description="Bath treatment",
            active=True
        )
        db.add(service)

        # Seed Admin
        admin = models.User(
            name="Admin Staff",
            email="admin@mypetcenter.com",
            phone="01200888841",
            password_hash=auth.hash_password("MyPetCenter#2026!Admin"),
            role="admin"
        )
        # Seed Customer
        customer = models.User(
            name="Normal Customer",
            email="customer@example.com",
            phone="01012345678",
            password_hash=auth.hash_password("custpass123"),
            role="customer"
        )
        db.add_all([admin, customer])
        db.commit()

        cls.admin_token = auth.create_access_token(data={"sub": str(admin.id), "role": "admin"})
        cls.cust_token = auth.create_access_token(data={"sub": str(customer.id), "role": "customer"})

        # Create a sample booking for admin management
        booking_date = date.today() + timedelta(days=2)
        booking = crud.create_booking(db, user=customer, booking_in=schemas.BookingCreate(
            booking_date=booking_date,
            start_time=schemas.time(16, 0),
            special_notes="Sample notes for admin test"
        ))
        cls.sample_booking_id = booking.id
        db.close()

    def test_01_customer_cannot_access_admin_endpoints(self):
        """Test RBAC: Customer receives 403 Forbidden when calling admin APIs."""
        endpoints = [
            ("GET", "/admin/dashboard"),
            ("GET", "/admin/bookings"),
            ("GET", "/admin/settings"),
            ("GET", "/admin/services"),
            ("PATCH", "/admin/settings/max_simultaneous_bookings", {"value": "2"})
        ]
        for item in endpoints:
            method, path = item[0], item[1]
            body = item[2] if len(item) > 2 else None
            if method == "GET":
                res = self.client.get(path, headers={"Authorization": f"Bearer {self.cust_token}"})
            else:
                res = self.client.patch(path, headers={"Authorization": f"Bearer {self.cust_token}"}, json=body)
            self.assertEqual(res.status_code, 403, f"Endpoint {path} did not reject customer with 403 Forbidden.")

    def test_02_unauthenticated_requests_rejected(self):
        """Test unauthenticated requests receive 401 Unauthorized."""
        res = self.client.get("/admin/dashboard")
        self.assertEqual(res.status_code, 401)

    def test_03_admin_login_endpoint(self):
        """Test private admin login endpoint."""
        # Success with admin
        res = self.client.post("/auth/admin-login", json={
            "email": "admin@mypetcenter.com",
            "password": "MyPetCenter#2026!Admin"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["role"], "admin")

        # Rejection of normal customer attempting to log in as admin
        res_cust = self.client.post("/auth/admin-login", json={
            "email": "customer@example.com",
            "password": "custpass123"
        })
        self.assertEqual(res_cust.status_code, 403)

    def test_04_admin_dashboard_stats(self):
        """Test admin can retrieve dashboard statistics."""
        res = self.client.get("/admin/dashboard", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("today_count", data)
        self.assertIn("upcoming_count", data)
        self.assertIn("capacity_percentage", data)

    def test_05_admin_view_and_filter_bookings(self):
        """Test admin can view, search, and filter bookings."""
        # Search by customer name
        res = self.client.get("/admin/bookings?customer_name=Normal", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 1)

        # Filter by status
        res_status = self.client.get("/admin/bookings?status_filter=confirmed", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_status.status_code, 200)

    def test_06_admin_update_booking_status(self):
        """Test admin can mark booking as completed and no-show."""
        res_completed = self.client.patch(
            f"/admin/bookings/{self.sample_booking_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"status": "completed"}
        )
        self.assertEqual(res_completed.status_code, 200)
        self.assertEqual(res_completed.json()["status"], "completed")

        res_noshow = self.client.patch(
            f"/admin/bookings/{self.sample_booking_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"status": "no-show"}
        )
        self.assertEqual(res_noshow.status_code, 200)
        self.assertEqual(res_noshow.json()["status"], "no-show")

    def test_07_admin_reschedule_booking(self):
        """Test admin can reschedule a booking to a new valid whole-hour slot."""
        new_date = (date.today() + timedelta(days=3)).isoformat()
        res = self.client.post(
            f"/admin/bookings/{self.sample_booking_id}/reschedule",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"booking_date": new_date, "start_time": "18:00:00"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["booking_date"], new_date)
        self.assertEqual(res.json()["start_time"], "18:00:00")

    def test_08_admin_settings_crud_and_validation(self):
        """Test admin can configure business settings with validation."""
        # 1. Update capacity to 3
        res_cap = self.client.patch(
            "/admin/settings/max_simultaneous_bookings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "3"}
        )
        self.assertEqual(res_cap.status_code, 200)
        self.assertEqual(res_cap.json()["value"], "3")

        # 2. Update slot interval to 60
        res_slot = self.client.patch(
            "/admin/settings/slot_interval_minutes",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "60"}
        )
        self.assertEqual(res_slot.status_code, 200)
        self.assertEqual(res_slot.json()["value"], "60")

        # 3. Invalid capacity rejected
        res_inv_cap = self.client.patch(
            "/admin/settings/max_simultaneous_bookings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "-1"}
        )
        self.assertEqual(res_inv_cap.status_code, 400)

        # 4. Invalid time format rejected
        res_inv_time = self.client.patch(
            "/admin/settings/opening_time",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "invalid_time"}
        )
        self.assertEqual(res_inv_time.status_code, 400)

        # 5. Reset capacity back to 1
        res_reset = self.client.patch(
            "/admin/settings/max_simultaneous_bookings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"value": "1"}
        )
        self.assertEqual(res_reset.status_code, 200)

if __name__ == "__main__":
    unittest.main()
