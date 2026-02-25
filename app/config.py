from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB Connection
    MONGODB_URL: str = "mongodb://localhost:27017"

    # Ginyaki DB name differs between environments:
    # Local:  sentipulse
    # Server: sentipulreviews
    GINYAKI_DATABASE_NAME: str = "sentipulreviews"

    # Server Configuration
    PORT: int = 9013
    HOST: str = "0.0.0.0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Initialize the settings object
settings = Settings()
