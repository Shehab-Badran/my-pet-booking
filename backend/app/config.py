from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./pet_booking.db"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    JWT_SECRET: str = "my_pet_center_secure_jwt_secret_key_2026_zx98"
    ADMIN_EMAIL: str = "admin@mypetcenter.com"
    ADMIN_PHONE: str = "01200888841"
    ADMIN_PASSWORD: str = "MyPetCenter#2026!Admin"

    # SMTP Configuration for Password Recovery
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@mypetcenter.com"
    SMTP_FROM_NAME: str = "My Pet Center"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()