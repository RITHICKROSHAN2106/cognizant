import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.database.mongo_seed import seed_mongodb
from app.api import (
    auth, admin, patients, predictions, recommendations, analytics,
    system, fhir, chat, reports, reference, vitals_ws,
    copilot, post_discharge
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("medinsight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure MongoDB collections are initialized and seeded
    logger.info("Initializing MedInsight AI MongoDB database...")
    try:
        seed_mongodb()
        logger.info("MedInsight AI MongoDB database initialized and verified.")
    except Exception as e:
        logger.error(f"Error during MongoDB initialization: {e}")
    yield
    # Shutdown
    logger.info("Shutting down MedInsight AI backend services.")


app = FastAPI(
    title="MedInsight AI — Clinical Decision Support & Readmission Prediction Platform",
    description="""
    ## MedInsight AI Hospital Readmission Platform API (MongoDB & Gemini AI)
    
    A clinical intelligence system designed for inpatient EHR surveillance, 
    risk stratification, SHAP-driven explainable AI, Contextual Clinical Copilot,
    Post-Discharge Recovery & Continuity of Care, and personalized prevention workflows.
    """,
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure Hardened CORS: Explicit trusted origins + LAN & Cloud regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.vercel\.app|.*\.onrender\.com|.*\.azurewebsites\.net)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload parameters.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) if "development" in settings.ML_MODEL_TYPE else "An unexpected internal clinical server error occurred."
            }
        }
    )


# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")
app.include_router(post_discharge.router, prefix="/api")
app.include_router(reference.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(reports.reports_router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(fhir.router, prefix="/api")
app.include_router(vitals_ws.router)



@app.get("/", tags=["Health"])
def root():
    return {
        "service": "MedInsight AI Clinical Backend (MongoDB)",
        "status": "online",
        "database": "MongoDB Atlas",
        "documentation": "/docs",
        "health": "/api/system/health"
    }
