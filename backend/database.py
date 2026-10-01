import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BASE_DIR, "fitness_tracker.db")
DEFAULT_DB_URL = f"sqlite:///{SQLITE_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

def _get_engine():
    try:
        eng = create_engine(DATABASE_URL)
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"Primary DB connection failed ({e}). Using local SQLite db at {SQLITE_PATH}.")
        sqlite_url = f"sqlite:///{SQLITE_PATH}"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


