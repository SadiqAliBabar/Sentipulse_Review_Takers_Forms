from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # MongoDB Configuration
    # Defaults are provided if the .env file or environment variables are missing
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "Sweetaffair"
    COLLECTION_NAME: str = "Sweetaffair_inhouse_reviews"

    # Ginyaki uses different DB names on local vs server
    # Local: sentipulse  |  Server: sentipulreviews
    GINYAKI_DATABASE_NAME: str = "sentipulse"

    # Server Configuration
    PORT: int = 9013
    HOST: str = "0.0.0.0"

    # Pydantic Settings will look for a .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Initialize the settings object
settings = Settings()
