import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
import models
from database import Base

load_dotenv()
url = os.getenv("DATABASE_URL")
print(f"Connecting to: {url}")

try:
    engine = create_engine(url, echo=True)
    print("Dropping old tables to update the structure...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating new tables with the updated columns...")
    Base.metadata.create_all(bind=engine)
    print("Tables updated successfully!")
except Exception as e:
    print(f"ERROR: {e}")
