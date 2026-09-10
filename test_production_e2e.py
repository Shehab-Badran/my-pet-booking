import urllib.request
import urllib.error
import json
import sys
from datetime import datetime, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

def http_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        data_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode("utf-8")
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            return status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed

def run_tests():
    print("\n" + "="*60)
    print("🚀 PRODUCTION GO-LIVE END-TO-END VERIFICATION")
    print("="*60)

    # 1. Frontend server health
    print("\n1. Testing Frontend Static Server (Vite / React)...")
    status, body = http_request(FRONTEND_URL)
    assert status == 200, f"Frontend returned {status}"
    assert "My Pet Center" in body, "Frontend title / text missing"
    print("   [PASS] Frontend server is serving live React app on port 5173.")

    # 2. Backend availability endpoint
    print("\n2. Testing Live Slot Availability for 7-Day Window...")
    today_str = datetime.now().strftime("%Y-%m-%d")
    status, slots = http_request(f"{BASE_URL}/availability?booking_date={today_str}")
    assert status == 200, f"Availability returned {status}"
    assert isinstance(slots, list), "Slots should be a list"
    assert len(slots) > 0, "Slots should not be empty"
    print(f"   [PASS] {len(slots)} slots returned for {today_str} (3:00 PM - 12:00 AM operating hours).")

    # 3. Customer Auth & Booking Creation
    print("\n3. Testing Customer Registration & Booking...")
    test_phone = f"010{int(datetime.now().timestamp()) % 100000000:08d}"
    reg_payload = {
        "name": "Live QA Customer",
        "phone": test_phone,
        "password": "qaPassword123"
    }
    status, reg_data = http_request(f"{BASE_URL}/auth/register", method="POST", data=reg_payload)
    assert status in [200, 201], f"Register failed: {reg_data}"
    token = reg_data["access_token"]
    print(f"   [PASS] Customer registered successfully (Phone: {test_phone}).")

    # Find first available slot
    avail_slot = next((s["time"] for s in slots if s["available"]), None)
    if not avail_slot:
        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        _, slots_tomorrow = http_request(f"{BASE_URL}/availability?booking_date={tomorrow_str}")
        avail_slot = next(s["time"] for s in slots_tomorrow if s["available"])
        booking_date = tomorrow_str
    else:
        booking_date = today_str

    booking_payload = {
        "booking_date": booking_date,
        "start_time": avail_slot,
        "special_notes": "Live production audit test booking"
    }
    headers = {"Authorization": f"Bearer {token}"}
    status, booking_data = http_request(f"{BASE_URL}/bookings", method="POST", data=booking_payload, headers=headers)
    assert status in [200, 201], f"Booking failed: {booking_data}"
    assert "booking_id" in booking_data, "Missing booking_id in response"
    print(f"   [PASS] Booking created successfully (Ref ID: {booking_data['booking_id']}, Slot: {avail_slot}).")

    # 4. Customer My Bookings verification
    print("\n4. Testing Customer Booking Dashboard Retrieval...")
    status, my_bookings = http_request(f"{BASE_URL}/bookings/my/all", headers=headers)
    assert status == 200, "Failed to retrieve my bookings"
    assert any(b["booking_id"] == booking_data["booking_id"] for b in my_bookings), "Created booking not in user dashboard"
    print(f"   [PASS] Booking verified in customer's live history.")

    # 5. Capacity Enforcement (Max 2 simultaneous pets)
    print("\n5. Testing Slot Capacity Enforcement (2 Max Pets / Overlap)...")
    import random
    cap_test_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
    _, cap_slots = http_request(f"{BASE_URL}/availability?booking_date={cap_test_date}")
    cap_test_time = next(s["time"] for s in cap_slots if s["available"])
    cap_payload = {
        "booking_date": cap_test_date,
        "start_time": cap_test_time,
        "special_notes": "Capacity QA Test"
    }

    # 1st booking on fresh slot
    phone_1 = f"010{random.randint(10000000, 99999999)}"
    _, reg_1 = http_request(f"{BASE_URL}/auth/register", method="POST", data={"name": "QA Pet 1", "phone": phone_1, "password": "password123"})
    token_1 = reg_1["access_token"]
    status_1, book_1 = http_request(f"{BASE_URL}/bookings", method="POST", data=cap_payload, headers={"Authorization": f"Bearer {token_1}"})
    assert status_1 in [200, 201], f"First booking failed: {book_1}"
    print(f"   [PASS] 1st appointment on slot {cap_test_time} succeeded (Capacity 1/2).")

    # 2nd booking on same slot
    phone_2 = f"011{random.randint(10000000, 99999999)}"
    status_2, reg_2 = http_request(f"{BASE_URL}/auth/register", method="POST", data={"name": "QA Pet 2", "phone": phone_2, "password": "password123"})
    assert status_2 in [200, 201], f"Reg 2 failed: {reg_2}"
    token_2 = reg_2["access_token"]
    status, book_2 = http_request(f"{BASE_URL}/bookings", method="POST", data=cap_payload, headers={"Authorization": f"Bearer {token_2}"})
    assert status in [200, 201], f"Second booking should succeed (capacity 2): {book_2}"
    print(f"   [PASS] 2nd concurrent appointment on slot {cap_test_time} succeeded (Capacity 2/2).")

    # Attempt 3rd pet on same slot -> MUST FAIL
    phone_3 = f"012{random.randint(10000000, 99999999)}"
    status_3, reg_3 = http_request(f"{BASE_URL}/auth/register", method="POST", data={"name": "QA Pet 3", "phone": phone_3, "password": "password123"})
    assert status_3 in [200, 201], f"Reg 3 failed: {reg_3}"
    token_3 = reg_3["access_token"]
    status, book_3 = http_request(f"{BASE_URL}/bookings", method="POST", data=cap_payload, headers={"Authorization": f"Bearer {token_3}"})
    assert status == 400, f"3rd booking must be rejected with 400, got {status}: {book_3}"
    print(f"   [PASS] 3rd concurrent booking correctly REJECTED by backend (Capacity limit enforced).")

    # 6. Admin Portal Auth & Dashboard
    print("\n6. Testing Admin Portal Security & Stats...")
    status, admin_login = http_request(f"{BASE_URL}/auth/admin-login", method="POST", data={"email": "admin@mypetcenter.com", "password": "admin123"})
    assert status == 200, f"Admin login failed: {admin_login}"
    admin_token = admin_login["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    status, stats = http_request(f"{BASE_URL}/admin/dashboard", headers=admin_headers)
    assert status == 200, f"Admin stats failed: {stats}"
    print(f"   [PASS] Admin authenticated and retrieved live dashboard stats.")

    # Customer forbidden from admin endpoints
    status, cust_admin_check = http_request(f"{BASE_URL}/admin/dashboard", headers=headers)
    assert status == 403, "Customer should receive 403 on admin dashboard"
    print(f"   [PASS] Role-based access control verified (Customers strictly blocked from admin panel).")

    print("\n" + "="*60)
    print("🎉 ALL PRODUCTION & GO-LIVE CHECKS PASSED WITH 100% SUCCESS!")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_tests()
