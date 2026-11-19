# ParkSetu backend

FastAPI backend for the ParkSetu demo. It uses SQLite, SQLAlchemy, JWT bearer auth, APScheduler, and an optional camera/vision endpoint.

## Run locally

Use Python 3.11 or newer. From this directory:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

The API is at `http://localhost:8000` and Swagger is at `http://localhost:8000/docs`. The SQLite file is `backend/parksetu.db` when commands run from this directory.

## Demo accounts

All seeded accounts use password `demo1234`:

| Role | Email |
| --- | --- |
| Driver | `driver@demo.com` |
| Owner | `owner@demo.com` |
| Admin | `admin@demo.com` |

Public registration supports driver and owner roles. Admin accounts are provisioned through seeding so a public registration cannot grant admin access.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./parksetu.db` | SQLAlchemy database URL |
| `JWT_SECRET` | `dev-only-change-me` | JWT signing secret; replace outside a local demo |
| `JWT_EXPIRE_MINUTES` | `1440` | Bearer token lifetime |
| `EDGE_API_KEY` | `dev-edge-key` | Key for the vision endpoint |
| `DEMO_MODE` | `true` | Enables 2-minute grace, 3-minute reminders, 15-second scheduler ticks |
| `CORS_ORIGIN` | `http://localhost:5173` | Documented frontend origin (CORS currently allows this MVP origin) |

With `DEMO_MODE=false`, grace and reminder windows are 15 minutes and jobs tick every 60 seconds.

## API examples

Examples use PowerShell `curl.exe`. Replace the sample IDs/times with values returned by the API. The API accepts timestamps with an offset or `Z` and returns UTC timestamps ending in `Z`.

### Auth

API health:

```powershell
curl.exe http://localhost:8000/
```

Register a driver:

```powershell
curl.exe -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d '{"name":"Asha","email":"asha@example.com","password":"demo-password","role":"driver"}'
```

Login (also used for seeded accounts):

```powershell
curl.exe -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"driver@demo.com","password":"demo1234"}'
```

Copy the returned token into `$token` for authenticated calls:

```powershell
$token = "PASTE_TOKEN_HERE"
```

### Lots and slots

Find nearby lots and available capacity for a time window:

```powershell
curl.exe "http://localhost:8000/lots/nearby?lat=19.2813&lng=72.8689&radius_km=5&start=2026-11-20T10:00:00Z&end=2026-11-20T12:00:00Z"
```

Get one lot:

```powershell
curl.exe http://localhost:8000/lots/1
```

List its slots:

```powershell
curl.exe http://localhost:8000/lots/1/slots
```

Create a lot as an owner:

```powershell
curl.exe -X POST http://localhost:8000/lots -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"name":"New Lot","address":"Mira Road","lat":19.28,"lng":72.87,"price_per_hour":25}'
```

Add slots to a lot owned by that account:

```powershell
curl.exe -X POST http://localhost:8000/lots/4/slots -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '[{"label":"A1","polygon":[[0,0],[10,0],[10,10],[0,10]],"is_buffer":false},{"label":"BUF-1","polygon":null,"is_buffer":true}]'
```

Get the lot forecast:

```powershell
curl.exe http://localhost:8000/lots/1/forecast
```

### Bookings and check-in

Create a booking as a driver:

```powershell
curl.exe -X POST http://localhost:8000/bookings -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"lot_id":1,"start_time":"2026-11-20T10:00:00Z","end_time":"2026-11-20T12:00:00Z","vehicle_no":"MH04AB1234"}'
```

List your bookings:

```powershell
curl.exe http://localhost:8000/bookings/me -H "Authorization: Bearer $token"
```

Check in with the booking's QR token:

```powershell
curl.exe -X POST http://localhost:8000/checkin -H "Content-Type: application/json" -d '{"qr_token":"PASTE_QR_TOKEN_HERE"}'
```

Extend a booking:

```powershell
curl.exe -X POST http://localhost:8000/bookings/1/extend -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"new_end_time":"2026-11-20T13:00:00Z"}'
```

Cancel a not-yet-checked-in booking:

```powershell
curl.exe -X POST http://localhost:8000/bookings/1/cancel -H "Authorization: Bearer $token"
```

Exit and calculate the final amount:

```powershell
curl.exe -X POST http://localhost:8000/bookings/1/exit -H "Authorization: Bearer $token"
```

Get alternate lots for a booking:

```powershell
curl.exe http://localhost:8000/bookings/1/alternatives -H "Authorization: Bearer $token"
```

If allocation fails, `POST /bookings` responds with HTTP 409 and a `detail` object containing `message` and available nearby `alternatives`.

### Vision, statistics, and WebSockets

Post a camera/simulator update:

```powershell
curl.exe -X POST http://localhost:8000/vision/slot-status -H "X-Edge-Key: dev-edge-key" -H "Content-Type: application/json" -d '{"lot_id":1,"ts":"2026-11-20T10:00:05Z","slots":[{"slot_id":1,"occupied":true,"confidence":0.91}]}'
```

Get owner/admin statistics (use the owner or admin token):

```powershell
curl.exe "http://localhost:8000/admin/stats?lot_id=1" -H "Authorization: Bearer $token"
```

WebSocket URLs:

- Lot updates: `ws://localhost:8000/ws/lots/1`
- User booking events: `ws://localhost:8000/ws/me?token=PASTE_TOKEN_HERE`

The lot stream emits `slot_update`; the user stream emits reminder, no-show, overstay, reroute, and extension events.

## Behavior notes

- Booking windows are half-open `[start_time, end_time)`. Buffer slots are never allocated.
- SQLite allocation checks and inserts are serialized within this API process. Run one backend worker for this SQLite MVP.
- One buffer slot is included in each seed lot's listed capacity; e.g. the 10-slot station lot has 9 bookable spaces.
- Forecasting attempts the optional `ml.forecast.forecast.predict_next_free` interface and falls back to the earliest active booking end time if it cannot import or run.
- Reminder delivery is tracked in memory for the lifetime of the backend process.
- `POST /checkin` accepts the QR token without JWT because it is intended for a gate/check-in flow. Keep QR tokens private.
