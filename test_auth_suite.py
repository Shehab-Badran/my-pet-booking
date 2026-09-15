import os
import sys
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
os.environ["DATABASE_URL"] = "sqlite:///./test_pet_booking.db"
os.environ["JWT_SECRET"] = "test_jwt_secret_key_12345"
os.environ["ADMIN_EMAIL"] = "admin@mypetcenter.com"
os.environ["ADMIN_PHONE"] = "01200888841"
os.environ["ADMIN_PASSWORD"] = "MyPetCenter#2026!Admin"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app import crud, models, auth

test_engine = create_engine("sqlite:///./test_pet_booking.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestAuthAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)
        
        # Seed settings
        db = TestingSessionLocal()
        db.add(models.Setting(key="opening_time", value="15:00:00"))
        db.add(models.Setting(key="closing_time", value="00:00:00"))
        db.add(models.Setting(key="max_simultaneous_bookings", value="1"))
        db.add(models.Setting(key="max_booking_days_ahead", value="7"))
        db.add(models.Setting(key="slot_interval_minutes", value="60"))
        
        # Seed admin
        admin = models.User(
            name="Admin Staff",
            email="admin@mypetcenter.com",
            phone="01200888841",
            password_hash=auth.hash_password("MyPetCenter#2026!Admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.close()

    def test_01_normal_signup(self):
        """Test customer registration with Name, Email, Phone, and Password."""
        res = self.client.post("/auth/register", json={
            "name": "Sarah Ali",
            "email": "sarah.ali@example.com",
            "phone": "01012345678",
            "password": "securepassword123"
        })
        self.assertEqual(res.status_code, 201, f"Signup failed: {res.text}")
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], "sarah.ali@example.com")
        self.assertEqual(data["user"]["name"], "Sarah Ali")
        self.assertEqual(data["user"]["phone"], "01012345678")

    def test_02_invalid_email_signup(self):
        """Test customer registration with invalid email format is rejected."""
        res = self.client.post("/auth/register", json={
            "name": "Invalid Email User",
            "email": "invalid-email-address",
            "phone": "01099998888",
            "password": "securepassword123"
        })
        self.assertEqual(res.status_code, 422)

    def test_03_duplicate_email_signup(self):
        """Test registration with existing email is rejected (400 Bad Request)."""
        res = self.client.post("/auth/register", json={
            "name": "Another Sarah",
            "email": "sarah.ali@example.com",  # Duplicate email
            "phone": "01198765432",
            "password": "anotherpassword"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("email address already exists", res.json()["detail"].lower())

    def test_04_duplicate_phone_signup(self):
        """Test registration with existing phone is rejected."""
        res = self.client.post("/auth/register", json={
            "name": "Another User",
            "email": "different.email@example.com",
            "phone": "01012345678",  # Duplicate phone
            "password": "anotherpassword"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("phone number already exists", res.json()["detail"].lower())

    def test_05_phone_normalization_egypt(self):
        """Test Egyptian phone numbers with +20, spaces, and arabic digits."""
        # Arabic digits + spaces
        res = self.client.post("/auth/register", json={
            "name": "Tamer Hosny",
            "email": "tamer@example.com",
            "phone": "+20 12 9988 7766",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["user"]["phone"], "01299887766")

    def test_06_login_with_phone_and_email(self):
        """Test customer can log in using either phone number or email."""
        # Login with phone
        res_phone = self.client.post("/auth/login", json={
            "phone": "01012345678",
            "password": "securepassword123"
        })
        self.assertEqual(res_phone.status_code, 200)
        self.assertIn("access_token", res_phone.json())

        # Login with email
        res_email = self.client.post("/auth/login", json={
            "phone": "sarah.ali@example.com",
            "password": "securepassword123"
        })
        self.assertEqual(res_email.status_code, 200)
        self.assertIn("access_token", res_email.json())

    def test_07_login_wrong_password(self):
        """Test login fails with incorrect password."""
        res = self.client.post("/auth/login", json={
            "phone": "sarah.ali@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 401)

    def test_08_forgot_password_anti_enumeration(self):
        """Test forgot password returns identical safe message for registered and non-registered emails."""
        # Registered email
        res_reg = self.client.post("/auth/forgot-password", json={"email": "sarah.ali@example.com"})
        self.assertEqual(res_reg.status_code, 200)
        msg_reg = res_reg.json()["message"]

        # Unregistered email
        res_unreg = self.client.post("/auth/forgot-password", json={"email": "nonexistent@example.com"})
        self.assertEqual(res_unreg.status_code, 200)
        msg_unreg = res_unreg.json()["message"]

        self.assertEqual(msg_reg, msg_unreg, "Responses must be identical to prevent account enumeration.")

    def test_09_password_reset_full_flow(self):
        """Test full password reset cycle: token verification, password reset, token invalidation, login with new password."""
        db = TestingSessionLocal()
        user = crud.get_user_by_email(db, "sarah.ali@example.com")
        token = crud.create_password_reset_token(db, user, expires_minutes=15)
        db.close()

        # 1. Verify token
        res_verify = self.client.get(f"/auth/verify-reset-token?token={token}")
        self.assertEqual(res_verify.status_code, 200)
        self.assertTrue(res_verify.json()["valid"])
        self.assertIn("***", res_verify.json()["email"])  # Masked email

        # 2. Reset password
        new_pwd = "brandNewPassword2026!"
        res_reset = self.client.post("/auth/reset-password", json={
            "token": token,
            "new_password": new_pwd
        })
        self.assertEqual(res_reset.status_code, 200)

        # 3. Token should now be invalid (cannot be reused)
        res_reuse = self.client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "anotherPassword123"
        })
        self.assertEqual(res_reuse.status_code, 400, "Reset token must be single-use only.")

        # 4. Verification of used token returns valid=False
        res_verify_used = self.client.get(f"/auth/verify-reset-token?token={token}")
        self.assertFalse(res_verify_used.json()["valid"])

        # 5. Old password no longer works
        res_old = self.client.post("/auth/login", json={
            "phone": "sarah.ali@example.com",
            "password": "securepassword123"
        })
        self.assertEqual(res_old.status_code, 401)

        # 6. New password works
        res_new = self.client.post("/auth/login", json={
            "phone": "sarah.ali@example.com",
            "password": new_pwd
        })
        self.assertEqual(res_new.status_code, 200)

    def test_10_expired_token_rejected(self):
        """Test expired token is rejected."""
        db = TestingSessionLocal()
        user = crud.get_user_by_email(db, "sarah.ali@example.com")
        # Create an expired token (-5 minutes)
        token = crud.create_password_reset_token(db, user, expires_minutes=-5)
        db.close()

        res = self.client.get(f"/auth/verify-reset-token?token={token}")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["valid"])

        res_reset = self.client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "somepassword123"
        })
        self.assertEqual(res_reset.status_code, 400)

if __name__ == "__main__":
    unittest.main()
