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

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()