from dataclasses import dataclass
import os


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./parksetu.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    edge_api_key: str = os.getenv("EDGE_API_KEY", "dev-edge-key")
    demo_mode: bool = _bool_env("DEMO_MODE", True)
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")

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
