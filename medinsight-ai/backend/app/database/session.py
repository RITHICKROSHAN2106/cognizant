import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
engine_kwargs = {}

# Handle sqlite compatibility for seamless local development if needed
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True

try:
    engine = create_engine(db_url, **engine_kwargs)
    # Test connection
    with engine.connect() as conn:
        logger.info("Database connection established successfully.")
except Exception as e:
    logger.warning(f"Could not connect to {db_url}: {e}. Falling back to SQLite for local development.")
    sqlite_url = "sqlite:///./medinsight.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
