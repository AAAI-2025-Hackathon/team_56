import os
from dotenv import load_dotenv


print("Loading config.py")


env_path = load_dotenv()
print(f"Loaded .env file: {env_path}")
print(f"GOOGLE_MAPS_API_KEY from environment: {os.getenv('GOOGLE_MAPS_API_KEY')}")

class Config:
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
    print(f"GOOGLE_MAPS_API_KEY in Config class: {GOOGLE_MAPS_API_KEY}")