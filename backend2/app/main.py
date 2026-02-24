"""
FastAPI main application for TalentGraph V2
Runs on port 8001
"""

import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from app.database import init_db
import os

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('talentgraph_v2.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize database on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("[STARTUP] TalentGraph V2 API starting...")
    init_db()
    logger.info("[STARTUP] Database initialized successfully")
    yield
    # Shutdown
    logger.info("[SHUTDOWN] TalentGraph V2 API shutting down...")
    pass


app = FastAPI(
    title="TalentGraph V2 API",
    description="Candidate-centric talent marketplace",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ ROOT ============

@app.get("/", tags=["Health"])
def root():
    """API health check"""
    logger.info("[HEALTH] Root endpoint accessed")
    return {
        "message": "TalentGraph V2 API",
        "version": "2.0.0",
        "status": "running",
        "docs": "http://localhost:8001/docs"
    }


@app.get("/health", tags=["Health"])
def health():
    """Health check endpoint"""
    return {"status": "ok"}


# ============ ROUTERS ============
from app.routers import auth, candidates, company, job_postings, matches, recommendations, swipes, dashboard, applications, notifications

logger.info("[STARTUP] Registering routers...")
app.include_router(auth.router)
app.include_router(candidates.router)
app.include_router(company.router)
app.include_router(job_postings.router)
app.include_router(matches.router)
app.include_router(recommendations.router)
app.include_router(swipes.router)
app.include_router(dashboard.router)
app.include_router(applications.router)
app.include_router(notifications.router)
logger.info("[STARTUP] All routers registered successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )
