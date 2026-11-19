from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator, model_validator


def _iso_z(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)


class TokenUser(BaseModel):
    token: str
    user: UserOut


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["driver", "owner", "admin"] = "driver"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=1, max_length=300)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    price_per_hour: float = Field(gt=0)


class SlotCreate(BaseModel):
    label: str = Field(min_length=1, max_length=30)
    polygon: list[list[float]] | None = None
    is_buffer: bool = False


class SlotOut(BaseModel):
    id: int
    label: str
    status: str
    is_buffer: bool
    polygon: list[list[float]] | None


class LotOut(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    price_per_hour: float
    total_slots: int
    free_now: int


class BookingCreate(BaseModel):
    lot_id: int
    start_time: datetime
    end_time: datetime
    vehicle_no: str = Field(min_length=1, max_length=30)

    @field_validator("start_time", "end_time")
    @classmethod
    def normalize_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_window(self):
        from datetime import timedelta
        from app.services.timeutils import utc_now

        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        if self.end_time - self.start_time > timedelta(hours=12):
            raise ValueError("bookings may not exceed 12 hours")
        if self.start_time < utc_now() - timedelta(minutes=5):
            raise ValueError("start_time may not be more than 5 minutes in the past")
        return self


class ExtendIn(BaseModel):
    new_end_time: datetime

    @field_validator("new_end_time")
    @classmethod
    def normalize_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class CheckinIn(BaseModel):
    qr_token: str


class VisionSlot(BaseModel):
    slot_id: int
    occupied: bool
    confidence: float = Field(ge=0, le=1)


class VisionUpdate(BaseModel):
    lot_id: int
    ts: datetime
    slots: list[VisionSlot]


class BookingOut(BaseModel):
    id: int
    lot_id: int
    lot_name: str
    slot_id: int
    slot_label: str
    vehicle_no: str
    start_time: datetime
    end_time: datetime
    status: str
    qr_token: str
    checked_in_at: datetime | None
    exited_at: datetime | None
    amount: float
    overstay_minutes: int
    at_risk: bool

    @field_serializer("start_time", "end_time", "checked_in_at", "exited_at")
    def serialize_times(self, value: datetime | None):
        return _iso_z(value)
