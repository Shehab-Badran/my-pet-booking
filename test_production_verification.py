import os
import sys
from datetime import date, time, datetime, timedelta
import random

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

from backend.app.database import SessionLocal, engine, Base
from backend.app import crud, schemas, models
from fastapi.testclient import TestClient
from backend.app.main import app

def run_verification():
    print("=" * 70)
    print("MY PET CENTER COMPREHENSIVE PRODUCTION VERIFICATION")
    print("=" * 70)

    # Re-seed to ensure clean baseline
    from backend.app.seed import seed_db
    seed_db()

    client = TestClient(app)
    db = SessionLocal()

    try:
        # =========================================================================
        # 1. TEST SIGNUP WITH MULTIPLE EGYPTIAN PHONE FORMATS
        # =========================================================================
        print("\n--- 1. Testing Customer Signup & Phone Normalization ---")
        
        # Test 1a: Standard 11-digit Egyptian phone (010...)
        phone_standard = f"010{random.randint(10000000, 99999999)}"
        email_standard = f"kareem_{random.randint(10000000, 99999999)}@example.com"
        res_a = client.post("/auth/register", json={
            "name": "Kareem Adel",
            "phone": phone_standard,
            "password": "SecurePassword#2026",
            "email": email_standard
        })
        assert res_a.status_code == 201, f"Standard signup failed: {res_a.text}"
        data_a = res_a.json()
        assert data_a["user"]["phone"] == phone_standard, f"Expected {phone_standard}, got {data_a['user']['phone']}"
        print(f"   [PASS] 1a: Standard Egyptian phone registered: {phone_standard}")

        # Test 1b: Phone containing spaces (e.g. '011 4567 8901')
        rand_suffix = random.randint(10000000, 99999999)
        phone_with_spaces = f"011 {str(rand_suffix)[:4]} {str(rand_suffix)[4:]}"
        expected_normalized_b = f"011{rand_suffix}"
        res_b = client.post("/auth/register", json={
            "name": "Nour Mahmoud",
            "email": f"nour_{rand_suffix}@example.com",
            "phone": phone_with_spaces,
            "password": "SecurePassword#2026"
        })
        assert res_b.status_code == 201, f"Spaced phone signup failed: {res_b.text}"
        data_b = res_b.json()
        assert data_b["user"]["phone"] == expected_normalized_b, f"Expected {expected_normalized_b}, got {data_b['user']['phone']}"
        print(f"   [PASS] 1b: Spaced phone '{phone_with_spaces}' normalized to '{expected_normalized_b}'")

        # Test 1c: Phone with Country Code (+20 12...)
        rand_suffix_c = random.randint(10000000, 99999999)
        phone_with_plus20 = f"+20 12 {str(rand_suffix_c)[:4]} {str(rand_suffix_c)[4:]}"
        expected_normalized_c = f"012{rand_suffix_c}"
        res_c = client.post("/auth/register", json={
            "name": "Hana Tarek",
            "email": f"hana_{rand_suffix_c}@example.com",
            "phone": phone_with_plus20,
            "password": "SecurePassword#2026"
        })
        assert res_c.status_code == 201, f"+20 phone signup failed: {res_c.text}"
        data_c = res_c.json()
        assert data_c["user"]["phone"] == expected_normalized_c, f"Expected {expected_normalized_c}, got {data_c['user']['phone']}"
        print(f"   [PASS] 1c: Country code phone '{phone_with_plus20}' normalized to '{expected_normalized_c}'")

        # Test 1d: Login after registration with normalized or unnormalized formats
        # Login using original spaced phone
        login_res_1 = client.post("/auth/login", json={
            "phone": phone_with_spaces,
            "password": "SecurePassword#2026"
        })
        assert login_res_1.status_code == 200, f"Login with spaced phone failed: {login_res_1.text}"
        print(f"   [PASS] 1d: Customer logged in using spaced phone format '{phone_with_spaces}'")

        # Login using +20 format for the same customer
        login_res_2 = client.post("/auth/login", json={
            "phone": f"+20{expected_normalized_b}",
            "password": "SecurePassword#2026"
        })
        assert login_res_2.status_code == 200, f"Login with +20 phone failed: {login_res_2.text}"
        print(f"   [PASS] 1d: Customer logged in using +20 format '+20{expected_normalized_b}'")

        # Test 1e: Duplicate registration handling (Must return clear 400 Bad Request message, no crash or [object Object])
        dup_res = client.post("/auth/register", json={
            "name": "Duplicate User",
            "email": "another_unique_email@example.com",
            "phone": phone_with_spaces, # already exists
            "password": "AnotherPassword123"
        })
        assert dup_res.status_code == 400, f"Expected 400 for duplicate, got {dup_res.status_code}"
        dup_data = dup_res.json()
        assert "already exists" in dup_data["detail"].lower(), f"Unexpected error detail: {dup_data}"
        print(f"   [PASS] 1e: Duplicate registration rejected with user-friendly message: '{dup_data['detail']}'")

        # =========================================================================
        # 2. TEST NO GUEST BOOKING ENFORCEMENT
        # =========================================================================
        print("\n--- 2. Testing Strict Guest Booking Prevention ---")
        test_day = date.today() + timedelta(days=2)
        # Find first available slot on test_day
        avail_resp = client.get(f"/availability?booking_date={test_day}")
        avail_slots = avail_resp.json()
        chosen_slot = next((s["time"] for s in avail_slots if s["available"]), "17:00:00")

        booking_payload = {
            "booking_date": str(test_day),
            "start_time": chosen_slot,
            "special_notes": "Guest attempt test"
        }

        # Attempt booking without Authorization header (Guest)
        guest_res = client.post("/bookings", json=booking_payload)
        assert guest_res.status_code == 401, f"Expected 401 Unauthorized for guest booking, got {guest_res.status_code}: {guest_res.text}"
        print(f"   [PASS] 2a: Unauthenticated guest booking strictly REJECTED (HTTP 401: {guest_res.json()['detail']})")

        # Attempt booking with invalid token
        invalid_token_res = client.post("/bookings", json=booking_payload, headers={"Authorization": "Bearer invalid_token_xyz"})
        assert invalid_token_res.status_code == 401, f"Expected 401 for invalid token, got {invalid_token_res.status_code}"
        print("   [PASS] 2b: Invalid authentication token strictly REJECTED (HTTP 401)")

        # Valid authenticated customer booking
        cust_token = data_a["access_token"]
        auth_booking_res = client.post("/bookings", json=booking_payload, headers={"Authorization": f"Bearer {cust_token}"})
        assert auth_booking_res.status_code == 201, f"Authenticated booking failed: {auth_booking_res.text}"
        created_booking = auth_booking_res.json()
        assert "booking_id" in created_booking
        assert created_booking["booking_id"].startswith("MPC-")
        print(f"   [PASS] 2c: Authenticated customer booking SUCCEEDED (Booking ID: {created_booking['booking_id']} on {test_day} at {chosen_slot})")

        # =========================================================================
        # 3. TEST ADMIN ROLE & SECURITY RBAC
        # =========================================================================
        print("\n--- 3. Testing Admin Security & Authorization ---")
        
        # Admin login
        admin_login_res = client.post("/auth/admin-login", json={
            "email": "admin@mypetcenter.com",
            "password": "MyPetCenter#2026!Admin"
        })
        assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
        admin_auth_data = admin_login_res.json()
        assert admin_auth_data["user"]["role"] == "admin"
        admin_token = admin_auth_data["access_token"]
        print(f"   [PASS] 3a: Admin authenticated successfully (Role: {admin_auth_data['user']['role']})")

        # Admin access to admin stats
        admin_stats_res = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_stats_res.status_code == 200, f"Admin stats failed: {admin_stats_res.text}"
        print(f"   [PASS] 3b: Admin successfully accessed admin dashboard stats")

        # Customer attempts to access admin dashboard -> MUST 403 Forbidden
        cust_admin_res = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {cust_token}"})
        assert cust_admin_res.status_code == 403, f"Expected 403 Forbidden for customer, got {cust_admin_res.status_code}"
        print(f"   [PASS] 3c: Customer attempting admin dashboard received HTTP 403 Forbidden")

        # Customer attempts admin login -> MUST 403 Forbidden
        cust_login_to_admin = client.post("/auth/admin-login", json={
            "email": phone_standard,
            "password": "SecurePassword#2026"
        })
        assert cust_login_to_admin.status_code == 403, f"Expected 403 for customer admin-login, got {cust_login_to_admin.status_code}"
        print(f"   [PASS] 3d: Customer attempting admin login endpoint received HTTP 403 Forbidden")

        # =========================================================================
        # 4. TEST BOOKING RULES & SCHEDULING
        # =========================================================================
        print("\n--- 4. Testing Booking Rules & 7-Day Window ---")
        
        # Test availability inside 7-day window
        avail_res = client.get(f"/availability?booking_date={test_day}")
        assert avail_res.status_code == 200
        slots = avail_res.json()
        assert len(slots) > 0
        # Check start and end operating hours (3:00 PM - 12:00 AM)
        assert slots[0]["time"].startswith("15:00")
        print(f"   [PASS] 4a: Operating hours verified (First slot: {slots[0]['time']} = 3:00 PM)")

        # Test booking beyond 7 days (e.g. 10 days ahead) -> MUST FAIL
        future_date = date.today() + timedelta(days=10)
        future_booking_res = client.post("/bookings", json={
            "booking_date": str(future_date),
            "start_time": "16:00:00"
        }, headers={"Authorization": f"Bearer {cust_token}"})
        assert future_booking_res.status_code == 400, f"Expected 400 for >7 days booking, got {future_booking_res.status_code}"
        print(f"   [PASS] 4b: Booking beyond 7 days rejected: '{future_booking_res.json()['detail']}'")

        # Test My Bookings endpoint
        my_bookings_res = client.get("/bookings/my/all", headers={"Authorization": f"Bearer {cust_token}"})
        assert my_bookings_res.status_code == 200
        my_bookings = my_bookings_res.json()
        assert len(my_bookings) >= 1
        assert any(b["booking_id"] == created_booking["booking_id"] for b in my_bookings)
        print(f"   [PASS] 4c: Customer successfully retrieved their bookings list ({len(my_bookings)} booking(s))")

        print("\n" + "=" * 70)
        print("ALL CORE CAPABILITIES & SECURITY POLICIES VERIFIED 100%!")
        print("=" * 70 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
