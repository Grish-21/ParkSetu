from sqlalchemy import select

from app.auth import hash_password
from app.db import Base, SessionLocal, engine
from app.models import Lot, Slot, User


USERS = [
    ("Demo Driver", "driver@demo.com", "driver"),
    ("Demo Owner", "owner@demo.com", "owner"),
    ("Demo Admin", "admin@demo.com", "admin"),
]
LOTS = [
    ("Mira Road Station Plaza Parking", "Mira Road Station, Mira Bhayandar", 19.2813, 72.8689, 30.0, 10),
    ("Bhayandar Petrol Pump Lot", "Bhayandar West, Mira Bhayandar", 19.3109, 72.8517, 20.0, 6),
    ("Mira-Bhayandar Mall Parking", "Mira Bhayandar, Maharashtra", 19.2950, 72.8600, 40.0, 12),
]


def seed():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        user_by_email = {user.email: user for user in db.scalars(select(User)).all()}
        for name, email, role in USERS:
            if email not in user_by_email:
                user = User(name=name, email=email, password_hash=hash_password("demo1234"), role=role)
                db.add(user)
                user_by_email[email] = user
        db.flush()

        owner_id = user_by_email["owner@demo.com"].id
        existing_names = set(db.scalars(select(Lot.name)).all())
        for name, address, lat, lng, price, count in LOTS:
            if name in existing_names:
                continue
            lot = Lot(owner_id=owner_id, name=name, address=address,
                      lat=lat, lng=lng, price_per_hour=price,
                      overstay_multiplier=1.5, buffer_slots=1)
            db.add(lot)
            db.flush()
            # The listed capacity includes one reserved buffer slot.
            for index in range(1, count + 1):
                is_buffer = index == count
                label = "BUF-1" if is_buffer else f"A{index:02d}"
                db.add(Slot(lot_id=lot.id, label=label, is_buffer=is_buffer,
                            status="free", polygon=None))
        db.commit()
    print("Seed complete. Demo users use password demo1234.")


if __name__ == "__main__":
    seed()
