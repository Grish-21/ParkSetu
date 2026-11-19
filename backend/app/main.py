import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import Base, engine
from app.routers import admin, auth, bookings, checkin, lots, vision, ws
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.ws_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ws_manager.loop = asyncio.get_running_loop()
    start_scheduler()
    yield
    stop_scheduler()
    ws_manager.loop = None


app = FastAPI(title="ParkSetu API", version="1.0.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# CORS — "allow_origins=['*']" + "allow_credentials=True" is invalid per spec.
# When CORS_ORIGIN is "*" we disable credentials so wildcard is accepted.
# When a real origin list is supplied we enable credentials.
# ---------------------------------------------------------------------------
_cors_raw = settings.cors_origin.strip()
if _cors_raw == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,   # Must be False with wildcard
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    _origins = list({o.strip() for o in _cors_raw.split(",") if o.strip()} | {"http://localhost:5173"})
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(lots.router)
app.include_router(bookings.router)
app.include_router(checkin.router)
app.include_router(vision.router)
app.include_router(admin.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"name": "ParkSetu API", "docs": "/docs", "status": "ok"}
