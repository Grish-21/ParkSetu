# ParkSetu Frontend (React PWA)

ParkSetu is an IoT & AI-powered smart parking progressive web app (PWA) built for **Mira Bhayandar, Maharashtra, India**. Drivers discover nearby private parking lots (malls, petrol pumps, station plazas), book slots in advance, check in via QR gate pass, track remaining parking time with countdown timers, and receive real-time reroute alerts when congestion or overstay risks are detected by camera sensors.

---

## 🚀 Quick Run Instructions

### 1. Offline Demo Mode (Mock Mode - Default)
No backend required. Runs with realistic in-memory & localStorage mock data, simulated WebSocket CCTV updates, and interactive notifications:

```bash
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:5173`.

### 2. Live Backend Mode
When the FastAPI backend is running on `http://localhost:8000`:

1. Update `.env` (or set the environment variable):
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_USE_MOCK=false
   ```
2. Run `npm run dev` (no code changes needed).

### 3. Production Build & PWA Preview
```bash
npm run build
npm run preview
```

---

## 🔑 Demo Accounts (1-Click Login on `/login`)

| Role | Email | Password | Landing Page |
| :--- | :--- | :--- | :--- |
| **Driver** | `driver@demo.com` | `demo1234` | `/` (Nearby Lots & Map) |
| **Lot Owner** | `owner@demo.com` | `demo1234` | `/owner` (Owner Dashboard) |
| **Admin** | `admin@demo.com` | `demo1234` | `/admin` (City Analytics) |

---

## 📱 Screen-by-Screen Summary

1. **Login & Register (`/login`, `/register`)**
   - Quick 1-click login buttons for Driver, Owner, and Admin.
   - Registration with role selector (`driver` or `owner`).
   - Secure token persistence in `localStorage`, role-based auto-redirection, and 401 automatic logout.

2. **Home / Nearby Lots (`/`)**
   - HTML5 Geolocation with automatic fallback to Mira Road (`19.2813, 72.8689`).
   - **Interactive Leaflet Map (`MapView`)** with custom SVG markers displaying real-time available/total slots and popups.
   - Nearby lot cards sorted by distance with price, distance, and color-coded availability badges (Green: >30% free, Amber: low availability, Red: fully occupied).
   - Search bar and collapsible **Time Window Filter** (Start & End pickers) that dynamically filters slots available for that window.

3. **Lot Detail (`/lots/:id`)**
   - Live **Slot Grid (`SlotGrid`)** with color-coded slots:
     - 🟢 **Green:** Free
     - 🔴 **Red:** Occupied
     - ⚪ **Grey:** Buffer slot (safety reserve)
   - Real-time CCTV / YOLO slot detection updates via WebSocket (`/ws/lots/:id`).
   - **AI Availability Forecast** card powered by ML ensemble prediction with confidence score and next predicted free timestamp.
   - Sticky "Book a Slot Now" call-to-action.

4. **Booking Form (`/lots/:id/book`)**
   - Start / End datetime pickers (default: now to +1 hour) and vehicle registration input.
   - Real-time estimated duration and price calculation (`₹/hr`).
   - **409 Conflict Handling:** If all spots are booked for that window, displays alternative nearby lots as clickable cards.
   - **Success State:** Generates instant ticket with high-resolution **QR Pass**, assigned slot label, and vehicle number.

5. **My Bookings (`/bookings`)**
   - Cards showing status badge (`BOOKED`, `CHECKED_IN`, `OVERSTAY`, `COMPLETED`, `CANCELLED`).
   - Live second-by-second countdown to arrival window or expiration.
   - Overstay timer with red alert badge and running penalty amount calculation.
   - Expandable QR pass for gate check-in.
   - Action buttons:
     - **Extend (+30m):** Extends booking window by 30 minutes.
     - **Cancel:** For `BOOKED` sessions (releases slot).
     - **Exit Gate:** For `CHECKED_IN` or `OVERSTAY` sessions (completes session and logs exit).

6. **Gate Entry Simulator (`/gate`)**
   - Simulates physical parking gate barrier sensor.
   - Input QR token manually, choose from pre-filled active passes, or auto-load via URL query `?token=...`.
   - Approves entry, updates status to `CHECKED_IN`, marks slot occupied, and lifts barrier.

7. **Live Notifications & Smart Reroute Banner**
   - Connects to user WebSocket (`/ws/me?token=...`).
   - Floating toast popups for reminders, overstay alerts, slot releases, and extensions.
   - **Persistent Reroute Banner:** Triggered when the previous driver on a booked slot risks overstaying. Displays recommended alternative lots with instant 1-click "Switch" action.
   - Header includes a "Test Reroute" button for instant live demo presentation.

8. **Owner Dashboard (`/owner`)**
   - View live YOLO camera status across owned lots.
   - **Register New Lot:** Interactive map pin picker (click on map to set `lat`/`lng`), name, address, and hourly rate.
   - **Slot & Buffer Configurator:** Specify slot count and prefix (e.g. "A" -> A1..A10), and click individual slots to toggle them as non-bookable buffer reserves.

9. **Admin Analytics (`/admin`)**
   - Municipal parking overview with filter by lot or city aggregate.
   - Key metric cards: Total Bookings, Revenue, No-Show Rate, Overstay Rate.
   - **Recharts Line Chart:** Hourly occupancy curve (08:00 to 21:00).
   - **Recharts Bar Chart:** Peak congestion windows requiring driver reroutes.

10. **Progressive Web App (PWA)**
    - Configured with `vite-plugin-pwa`.
    - Standalone app manifest (`ParkSetu`), theme color `#4f46e5`, application icons, and offline caching via Workbox service worker.

---

## 📋 Contract Assumptions & Notes

1. **Timestamps & Timezones:**
   - All server communication (`start_time`, `end_time`, `ts`) uses standard ISO 8601 UTC strings with `Z` suffix.
   - All frontend UI displays are localized to Indian Standard Time (`Asia/Kolkata`).

2. **Booking Conflict (HTTP 409):**
   - The contract specifies HTTP 409 returns `{"detail": {"message": "...", "alternatives": [...]}}`. The frontend error handler extracts `alternatives` from `err.detail.alternatives` or `err.alternatives` and displays interactive recommendation cards.

3. **Buffer Slot Logic:**
   - As per Section 0.4, buffer slots (`is_buffer=true`) are never bookable by drivers and are rendered in grey with shield badges.

4. **WebSocket Fallback in Mock Mode:**
   - In `VITE_USE_MOCK=true`, `ws.ts` simulates background sensor fluctuations every 12 seconds and emits a demo reroute alert event after 20 seconds of activity (or on demand via the "Test Reroute" header button).
