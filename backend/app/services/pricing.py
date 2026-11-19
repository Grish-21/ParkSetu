from datetime import datetime
from math import ceil

from app.services.timeutils import as_utc


def calculate_amount(start_time: datetime, end_time: datetime, price_per_hour: float,
                     overstay_minutes: int = 0, overstay_multiplier: float = 1.5) -> float:
    start = as_utc(start_time)
    end = as_utc(end_time)
    hours = max(0, (end - start).total_seconds()) / 3600
    base = ceil(hours) * price_per_hour
    return round(base + (max(0, overstay_minutes) / 60) * price_per_hour * overstay_multiplier, 2)
