"""
app/api/v1/api.py
Central router for API version 1.

All v1 route modules are registered here and then mounted in main.py
under the API_V1_PREFIX (/api/v1 by default).

Adding a new resource:
  1. Create  app/api/v1/routes/my_resource.py
  2. Import  from app.api.v1.routes import my_resource
  3. Call    api_router.include_router(my_resource.router, ...)
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import health
from app.api.v1.routes import auth
from app.api.v1.routes import profiles
from app.api.v1.routes import emergency_requests
from app.api.v1.routes import emergency_contacts
from app.api.v1.routes import notifications
from app.api.v1.routes import messages
from app.api.v1.routes import responder
from app.api.v1.routes import organizations
from app.api.v1.routes import assistant
from app.api.v1.routes import ml_severity
from app.api.v1.routes import recommendation
from app.api.v1.routes import hospital
from app.api.v1.routes import admin
from app.api.v1.routes import nearby
from app.api.v1.routes import twilio_routes

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profiles.router, prefix="/profile", tags=["Profile"])
api_router.include_router(emergency_requests.router, prefix="/emergency-requests", tags=["Emergency Requests"])
api_router.include_router(emergency_contacts.router, prefix="/emergency-contacts", tags=["Emergency Contacts"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(responder.router, prefix="/responder", tags=["Responder"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["Assistant"])
api_router.include_router(ml_severity.router, prefix="/ml/severity", tags=["ML Severity Prediction"])
api_router.include_router(recommendation.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(hospital.router, prefix="/hospital", tags=["Hospital"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(nearby.router, prefix="/nearby", tags=["Nearby Services"])
api_router.include_router(twilio_routes.router, prefix="/twilio", tags=["Twilio"])
