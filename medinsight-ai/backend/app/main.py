import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.database.mongo_seed import seed_mongodb
from app.api import auth, patients, predictions, recommendations, analytics, system, fhir, chat, reports, reference, vitals_ws

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
    risk stratification, SHAP-driven explainable AI, Gemini AI patient chat, and personalized prevention workflows.
    
    ### Key Modules:
    - **Authentication**: JWT & Role-Based Access Control (MongoDB `users`)
    - **Clinical EHR**: Longitudinal Patient Records, Encounters, Diagnoses, Vitals, Labs, Medications
    - **Patient Registration**: Complete Multi-Section Intake Form (`POST /api/patients`)
    - **Patient AI Chat**: Patient-Specific Gemini LLM Chatbot (`POST /api/patients/{id}/chat`)
    - **Clinical Reports & PDF**: Automated Report Summary & Healthcare PDF Export (`GET /api/patients/{id}/report/pdf`)
    - **ML Service**: 30-Day Readmission Risk Scoring with Calibrated XGBoost & LightGBM
    - **Explainable AI (XAI)**: SHAP Feature Attributions and What-If Scenario Simulators
    - **Prevention & Discharge**: Clinical Decision Support Recommendations & Discharge Readiness Scoring
    - **Interoperability**: HL7 FHIR R4 Adapters & MongoDB Atlas Status
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(patients.router, prefix="/api")
app.include_router(reference.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
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
