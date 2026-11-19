import time
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = "http://localhost:8000"

def log(msg):
    print(f"[TEST] {msg}", flush=True)

def run_tests():
    # 1. Check docs
    log("Checking API docs...")
    r = requests.get(f"{BASE_URL}/docs")
    assert r.status_code == 200, f"Docs failed: {r.status_code}"
    log("API Docs available (200 OK)")

    # 2. Driver login
    log("Logging in as driver@demo.com...")
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "driver@demo.com", "password": "demo1234"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    driver_token = r.json()["token"]
    driver_headers = {"Authorization": f"Bearer {driver_token}"}
    log("Driver authenticated successfully")

    # 3. Nearby lots
    log("Fetching nearby lots for Mira Bhayandar...")
    r = requests.get(f"{BASE_URL}/lots/nearby?lat=19.2813&lng=72.8689&radius_km=10")
    assert r.status_code == 200, f"Nearby failed: {r.text}"
    lots = r.json()
    assert len(lots) == 3, f"Expected 3 lots, got {len(lots)}"
    for lot in lots:
        log(f"Found lot: {lot['name']} (Total: {lot['total_slots']}, Free: {lot['free_now']})")

    # 4. Check lot 1 slots and forecast
    log("Checking Lot 1 slots and forecast...")
    r = requests.get(f"{BASE_URL}/lots/1/slots")
    slots = r.json()
    log(f"Lot 1 has {len(slots)} slots. Sample statuses: {[s['status'] for s in slots[:4]]}")

    r = requests.get(f"{BASE_URL}/lots/1/forecast")
    forecast = r.json()
    log(f"Lot 1 forecast: free_now={forecast['free_now']}, method={forecast['method']}, confidence={forecast['confidence']}")

    # 5. Book a slot
    now = datetime.now(timezone.utc)
    start = now.isoformat().replace("+00:00", "Z")
    end = (now + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    log("Creating booking on Lot 1...")
    r = requests.post(
        f"{BASE_URL}/bookings",
        headers=driver_headers,
        json={"lot_id": 1, "start_time": start, "end_time": end, "vehicle_no": "MH04DEMO88"}
    )
    assert r.status_code == 201, f"Booking failed: {r.text}"
    booking = r.json()
    booking_id = booking["id"]
    qr_token = booking["qr_token"]
    slot_label = booking["slot_label"]
    log(f"Booking confirmed: ID={booking_id}, Slot={slot_label}, Status={booking['status']}, QR={qr_token}")

    # Verify GET /bookings/me
    r = requests.get(f"{BASE_URL}/bookings/me", headers=driver_headers)
    my_bookings = r.json()
    assert any(b["id"] == booking_id for b in my_bookings), "Booking not listed in /bookings/me"
    log("Booking verified in /bookings/me")

    # 6. Gate check-in
    log("Simulating gate QR check-in...")
    r = requests.post(f"{BASE_URL}/checkin", json={"qr_token": qr_token})
    assert r.status_code == 200, f"Check-in failed: {r.text}"
    checked_in = r.json()
    assert checked_in["status"] == "CHECKED_IN", f"Expected CHECKED_IN, got {checked_in['status']}"
    log(f"Gate barrier opened! Status: {checked_in['status']}, checked_in_at: {checked_in['checked_in_at']}")

    # 7. Extend booking
    new_end = (now + timedelta(hours=2)).isoformat().replace("+00:00", "Z")
    log("Extending booking by +1 hour...")
    r = requests.post(f"{BASE_URL}/bookings/{booking_id}/extend", headers=driver_headers, json={"new_end_time": new_end})
    assert r.status_code == 200, f"Extend failed: {r.text}"
    log("Booking extension confirmed")

    # 8. Test 409 Conflict with full lot booking
    log("Testing 409 Conflict & alternatives logic...")
    # Lot 2 has only 5 bookable slots
    r = requests.get(f"{BASE_URL}/lots/2/slots")
    lot2_slots = [s for s in r.json() if not s["is_buffer"]]
    target_start = (now + timedelta(hours=5)).isoformat().replace("+00:00", "Z")
    target_end = (now + timedelta(hours=6)).isoformat().replace("+00:00", "Z")

    for i in range(len(lot2_slots)):
        requests.post(
            f"{BASE_URL}/bookings",
            headers=driver_headers,
            json={"lot_id": 2, "start_time": target_start, "end_time": target_end, "vehicle_no": f"MH04FL{i:02d}"}
        )

    # Now attempt 1 more booking when lot 2 is full for that window
    r = requests.post(
        f"{BASE_URL}/bookings",
        headers=driver_headers,
        json={"lot_id": 2, "start_time": target_start, "end_time": target_end, "vehicle_no": "MH04FULL"}
    )
    assert r.status_code == 409, f"Expected 409, got {r.status_code}"
    conflict_detail = r.json()["detail"]
    assert "alternatives" in conflict_detail, "409 response missing alternatives"
    log(f"409 Conflict correctly triggered! Message: '{conflict_detail['message']}', Alternatives count: {len(conflict_detail['alternatives'])}")

    # 9. Admin Stats test
    log("Testing Admin login and stats analytics...")
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@demo.com", "password": "demo1234"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["token"]
    r = requests.get(f"{BASE_URL}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, f"Admin stats failed: {r.text}"
    stats = r.json()
    log(f"Admin stats: total_bookings={stats['bookings_total']}, revenue={stats['revenue']}, hourly_bins={len(stats['occupancy_by_hour'])}")

    log("ALL 9 SMOKE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
