from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ApplicationType(str, Enum):
    hospital = "hospital"
    responder = "responder"


class ApplicationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class UserRole(str, Enum):
    user = "user"
    responder = "responder"
    volunteer = "volunteer"
    hospital_staff = "hospital_staff"
    admin = "admin"


class AccountStatus(str, Enum):
    active = "active"
    suspended = "suspended"


class OrganizationType(str, Enum):
    hospital = "hospital"
    responder = "responder"


class AdminDashboardStats(BaseModel):
    total_users: int
    total_responders: int
    total_hospitals: int
    total_emergency_requests: int
    active_emergencies: int
    pending_applications: int
    critical_requests: int
    completed_requests: int
    suspended_accounts: int
    pending_account_deletions: int


class AdminApplicationResponse(BaseModel):
    id: str
    user_id: str
    application_type: ApplicationType
    organization_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    license_or_registration_number: Optional[str] = None
    status: ApplicationStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminApplicationReviewRequest(BaseModel):
    application_id: str = Field(..., description="ID of the application to review")
    rejection_reason: Optional[str] = Field(None, min_length=10, max_length=500, description="Reason for rejection (required when rejecting)")

    model_config = ConfigDict(extra="forbid")


class AdminUserListResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    account_status: AccountStatus
    created_at: datetime
    last_sign_in_at: Optional[datetime] = None
    emergency_request_count: int = 0
    organization_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserDetailResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    account_status: AccountStatus
    created_at: datetime
    last_sign_in_at: Optional[datetime] = None
    emergency_request_count: int = 0
    organization_name: Optional[str] = None
    organization_id: Optional[str] = None
    organization_role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool = True

    model_config = ConfigDict(from_attributes=True)


class AdminRoleUpdateRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user to update")
    new_role: UserRole = Field(..., description="New role to assign")

    model_config = ConfigDict(extra="forbid")


class AdminSuspendRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user to suspend")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for suspension")

    model_config = ConfigDict(extra="forbid")


class AdminHospitalResponse(BaseModel):
    id: str
    name: str
    organization_type: OrganizationType
    is_verified: bool
    address: Optional[str] = None
    phone: Optional[str] = None
    staff_count: int = 0
    bed_capacity: Optional[int] = None
    available_ambulances: int = 0
    active_requests: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminResponderResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    responder_type: Optional[str] = None
    organization_name: Optional[str] = None
    availability_status: str = "offline"
    approval_status: str
    active_assignment: Optional[str] = None
    completed_request_count: int = 0
    created_at: datetime
    account_status: AccountStatus

    model_config = ConfigDict(from_attributes=True)


class AdminEmergencyRequestResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    emergency_type: str
    severity: str
    status: str
    assigned_responder_id: Optional[str] = None
    assigned_responder_name: Optional[str] = None
    recommended_hospital_id: Optional[str] = None
    recommended_hospital_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    location_label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminOrganizationResponse(BaseModel):
    id: str
    name: str
    organization_type: OrganizationType
    is_verified: bool
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    member_count: int = 0
    active_responders: int = 0
    active_requests: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    request_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAnalyticsResponse(BaseModel):
    emergency_requests_by_day: List[dict]
    emergency_type_distribution: List[dict]
    severity_distribution: List[dict]
    request_status_distribution: List[dict]
    average_response_time: Optional[float] = None
    completion_rate: float
    hospital_acceptance_count: int
    responder_completion_count: int
    ai_usage_today: int
    ml_predictions_today: int
    recommendation_usage_today: int


class AdminSystemHealthResponse(BaseModel):
    frontend: str = "healthy"
    fastapi: str = "healthy"
    database: str = "healthy"
    realtime: str = "healthy"
    ai_assistant: str = "healthy"
    ml_model: str = "healthy"


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminApplicationsList(PaginatedResponse):
    items: List[AdminApplicationResponse]


class AdminUsersList(PaginatedResponse):
    items: List[AdminUserListResponse]


class AdminHospitalsList(PaginatedResponse):
    items: List[AdminHospitalResponse]


class AdminRespondersList(PaginatedResponse):
    items: List[AdminResponderResponse]


class AdminEmergencyRequestsList(PaginatedResponse):
    items: List[AdminEmergencyRequestResponse]


class AdminOrganizationsList(PaginatedResponse):
    items: List[AdminOrganizationResponse]


class AdminAuditLogsList(PaginatedResponse):
    items: List[AdminAuditLogResponse]
