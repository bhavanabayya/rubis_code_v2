"""
Database configuration for TalentGraph V2
PostgreSQL with SQLModel ORM
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session

# Load environment variables
load_dotenv()

# PostgreSQL connection from environment variables
# Format: postgresql://user:password@host:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/talentgraph_v2"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Test connections for liveness
    pool_size=10,  # Connection pool size
    max_overflow=20,  # Max connections beyond pool_size
    echo=False  # Set to True for SQL debugging
)


def init_db():
    """Initialize database - create all tables"""
    # Import all models so they're registered
    from app.models import (
        User, Candidate, Resume, Certification, Skill, JobProfile,
        Company, JobPosting, Swipe, Match, Application, Notification
    )
    
    SQLModel.metadata.create_all(engine)
    print("✅ Database initialized successfully!")


def get_session():
    """Dependency for FastAPI - get database session"""
    with Session(engine) as session:
        yield session
