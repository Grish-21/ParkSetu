from dataclasses import dataclass
from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env file from backend directory or project root if present
env_paths = [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
]
for p in env_paths:
    if p.exists():
        load_dotenv(p)
        break


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_db_url(url: str) -> str:
    # Normalize postgres:// to postgresql+psycopg2:// for SQLAlchemy
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


@dataclass(frozen=True)
class Settings:
    database_url: str = _normalize_db_url(
        os.getenv("DATABASE_URL", "sqlite:///./parksetu.db")
    )
    jwt_secret: str = os.getenv(
        "JWT_SECRET", "4cf9bee4b412110d48144f46fc17f3bdd2a2ff7690381da5b0b45982cad56a2e"
    )
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    edge_api_key: str = os.getenv("EDGE_API_KEY", "e54pL6R66HzZIWsghegixR0LL_j59SFb")
    demo_mode: bool = _bool_env("DEMO_MODE", False)
    cors_origin: str = os.getenv(
        "CORS_ORIGIN",
        "https://park-setu.vercel.app,http://localhost:5173"
    )

    @property
    def grace_minutes(self) -> int:
        return 2 if self.demo_mode else 15

    @property
    def reminder_minutes(self) -> int:
        return 3 if self.demo_mode else 15

    @property
    def scheduler_tick_seconds(self) -> int:
        return 15 if self.demo_mode else 60


settings = Settings()
