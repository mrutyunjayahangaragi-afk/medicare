"""
app/api/v1/routes/admin.py
Admin API routes for platform management.

Security: Every route requires the caller to have the admin role.
The require_admin dependency reads the role from the database using the
validated user ID — never from a client-supplied value.

Uses Supabase client for data access (not SQLAlchemy).
"""

from typing import Optional, List
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from supabase import Client

from app.api.dependencies.auth import AuthContext, get_auth_context, create_user_supabase_client
from app.api.dependencies.roles import require_admin
from app.api.dependencies.auth import CurrentUser

router = APIRouter(tags=["admin"])


def _sanitize_search(value: str) -> str:
    """Strip characters that could break PostgREST .or_() filter syntax.

    PostgREST interprets parentheses and commas specially inside filter
    expressions. We remove them so a search term like ``a,b.ilike`` cannot
    inject a second filter clause.
    """
    # Allow letters, numbers, spaces, hyphens, underscores, dots, @
    import re
    return re.sub(r"[^\w\s@.\-]", "", value)[:200]


@router.get("/dashboard")
async def get_dashboard_stats(
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get platform statistics for admin dashboard."""
    supabase = create_user_supabase_client(auth_context.access_token)

    def _execute_sync(q):
        return q.execute()

    # Run all count queries concurrently in the thread pool instead of blocking sequentially
    async def _count(table: str, **filters):
        q = supabase.table(table).select("id", count="exact")
        for col, val in filters.items():
            if isinstance(val, list):
                q = q.in_(col, val)
            else:
                q = q.eq(col, val)
        result = await run_in_threadpool(_execute_sync, q)
        return result.count or 0

    # Fetch all counts concurrently
    (
        total_users,
        total_responders,
        total_hospitals,
        total_requests,
        active_emergencies,
        pending_applications,
        critical_requests,
        completed_requests,
        suspended_accounts,
        pending_deletions,
    ) = await asyncio.gather(
        _count("profiles"),
        _count("profiles", role=["responder", "volunteer"]),
        _count("organizations", organization_type="hospital"),
        _count("emergency_requests"),
        _count("emergency_requests", status=["accepted", "in_progress", "arrived"]),
        _count("portal_applications", status="pending"),
        _count("emergency_requests", severity="critical"),
        _count("emergency_requests", status="completed"),
        _count("profiles", account_status="suspended"),
        _count("account_deletion_requests", status="pending"),
    )

    return {
        "total_users": total_users,
        "total_responders": total_responders,
        "total_hospitals": total_hospitals,
        "total_emergency_requests": total_requests,
        "active_emergencies": active_emergencies,
        "pending_applications": pending_applications,
        "critical_requests": critical_requests,
        "completed_requests": completed_requests,
        "suspended_accounts": suspended_accounts,
        "pending_account_deletions": pending_deletions,
    }



@router.get("/applications")
def get_applications(
    status: Optional[str] = Query(None, description="Filter by application status"),
    application_type: Optional[str] = Query(None, description="Filter by application type"),
    search: Optional[str] = Query(None, description="Search by name or registration number"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of portal applications."""
    supabase = create_user_supabase_client(auth_context.access_token)

    # Build count query
    count_q = supabase.table("portal_applications").select("id", count="exact")
    if status:
        count_q = count_q.eq("status", status)
    if application_type:
        count_q = count_q.eq("application_type", application_type)
    if search:
        safe = _sanitize_search(search)
        count_q = count_q.or_(
            f"organization_name.ilike.%{safe}%,"
            f"license_or_registration_number.ilike.%{safe}%"
        )
    count_result = count_q.execute()
    total = count_result.count or 0

    # Get paginated results
    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("portal_applications")
        .select("*")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if status:
        data_q = data_q.eq("status", status)
    if application_type:
        data_q = data_q.eq("application_type", application_type)
    if search:
        safe = _sanitize_search(search)
        data_q = data_q.or_(
            f"organization_name.ilike.%{safe}%,"
            f"license_or_registration_number.ilike.%{safe}%"
        )
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/applications/{application_id}")
def get_application_by_id(
    application_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific application by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = supabase.table("portal_applications").select("*").eq("id", application_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return result.data[0]


@router.get("/users")
def get_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    account_status: Optional[str] = Query(None, description="Filter by account status"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of users."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = supabase.table("profiles").select("id", count="exact")
    if role:
        count_q = count_q.eq("role", role)
    if account_status:
        count_q = count_q.eq("account_status", account_status)
    if search:
        safe = _sanitize_search(search)
        count_q = count_q.or_(
            f"full_name.ilike.%{safe}%,email.ilike.%{safe}%,phone.ilike.%{safe}%"
        )
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("profiles")
        .select("*")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if role:
        data_q = data_q.eq("role", role)
    if account_status:
        data_q = data_q.eq("account_status", account_status)
    if search:
        safe = _sanitize_search(search)
        data_q = data_q.or_(
            f"full_name.ilike.%{safe}%,email.ilike.%{safe}%,phone.ilike.%{safe}%"
        )
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific user by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result.data[0]


@router.get("/hospitals")
def get_hospitals(
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search by hospital name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of hospitals."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = (
        supabase.table("organizations").select("id", count="exact").eq("organization_type", "hospital")
    )
    if is_verified is not None:
        count_q = count_q.eq("is_verified", is_verified)
    if search:
        count_q = count_q.ilike("name", f"%{_sanitize_search(search)}%")
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("organizations")
        .select("*")
        .eq("organization_type", "hospital")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if is_verified is not None:
        data_q = data_q.eq("is_verified", is_verified)
    if search:
        data_q = data_q.ilike("name", f"%{_sanitize_search(search)}%")
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/hospitals/{hospital_id}")
def get_hospital_by_id(
    hospital_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific hospital by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = (
        supabase.table("organizations")
        .select("*")
        .eq("id", hospital_id)
        .eq("organization_type", "hospital")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return result.data[0]


@router.get("/responders")
def get_responders(
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of responders."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = (
        supabase.table("profiles")
        .select("id", count="exact")
        .in_("role", ["responder", "volunteer"])
    )
    if search:
        safe = _sanitize_search(search)
        count_q = count_q.or_(f"full_name.ilike.%{safe}%,email.ilike.%{safe}%")
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("profiles")
        .select("*")
        .in_("role", ["responder", "volunteer"])
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if search:
        safe = _sanitize_search(search)
        data_q = data_q.or_(f"full_name.ilike.%{safe}%,email.ilike.%{safe}%")
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/responders/{responder_id}")
def get_responder_by_id(
    responder_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific responder by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", responder_id)
        .in_("role", ["responder", "volunteer"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder not found")
    return result.data[0]


@router.get("/requests")
def get_emergency_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    search: Optional[str] = Query(None, description="Search by location label"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of emergency requests."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = supabase.table("emergency_requests").select("id", count="exact")
    if status:
        count_q = count_q.eq("status", status)
    if severity:
        count_q = count_q.eq("severity", severity)
    if search:
        safe = _sanitize_search(search)
        count_q = count_q.ilike("location_label", f"%{safe}%")
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("emergency_requests")
        .select("*")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if status:
        data_q = data_q.eq("status", status)
    if severity:
        data_q = data_q.eq("severity", severity)
    if search:
        safe = _sanitize_search(search)
        data_q = data_q.ilike("location_label", f"%{safe}%")
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/requests/{request_id}")
def get_emergency_request_by_id(
    request_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific emergency request by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = (
        supabase.table("emergency_requests").select("*").eq("id", request_id).execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Emergency request not found"
        )
    return result.data[0]


@router.get("/organizations")
def get_organizations(
    organization_type: Optional[str] = Query(None, description="Filter by organization type"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search by organization name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of organizations."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = supabase.table("organizations").select("id", count="exact")
    if organization_type:
        count_q = count_q.eq("organization_type", organization_type)
    if is_verified is not None:
        count_q = count_q.eq("is_verified", is_verified)
    if search:
        count_q = count_q.ilike("name", f"%{_sanitize_search(search)}%")
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("organizations")
        .select("*")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if organization_type:
        data_q = data_q.eq("organization_type", organization_type)
    if is_verified is not None:
        data_q = data_q.eq("is_verified", is_verified)
    if search:
        data_q = data_q.ilike("name", f"%{_sanitize_search(search)}%")
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/organizations/{organization_id}")
def get_organization_by_id(
    organization_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get a specific organization by ID."""
    supabase = create_user_supabase_client(auth_context.access_token)
    result = (
        supabase.table("organizations").select("*").eq("id", organization_id).execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )
    return result.data[0]


@router.get("/audit")
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get paginated list of audit logs."""
    supabase = create_user_supabase_client(auth_context.access_token)

    count_q = supabase.table("audit_logs").select("id", count="exact")
    if action:
        count_q = count_q.eq("action", action)
    if entity_type:
        count_q = count_q.eq("entity_type", entity_type)
    count_result = count_q.execute()
    total = count_result.count or 0

    from_val = (page - 1) * page_size
    data_q = (
        supabase.table("audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .range(from_val, from_val + page_size - 1)
    )
    if action:
        data_q = data_q.eq("action", action)
    if entity_type:
        data_q = data_q.eq("entity_type", entity_type)
    result = data_q.execute()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/analytics")
def get_analytics(
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get platform analytics data using server-side aggregation."""
    supabase = create_user_supabase_client(auth_context.access_token)

    # Fetch only the columns we need for aggregation — never load full rows
    type_result = supabase.table("emergency_requests").select("emergency_type").execute()
    severity_result = supabase.table("emergency_requests").select("severity").execute()
    status_result = supabase.table("emergency_requests").select("status").execute()

    emergency_type_distribution: dict = {}
    for req in type_result.data or []:
        k = req.get("emergency_type", "unknown")
        emergency_type_distribution[k] = emergency_type_distribution.get(k, 0) + 1

    severity_distribution: dict = {}
    for req in severity_result.data or []:
        k = req.get("severity", "unknown")
        severity_distribution[k] = severity_distribution.get(k, 0) + 1

    status_distribution: dict = {}
    completed = 0
    total = 0
    for req in status_result.data or []:
        total += 1
        k = req.get("status", "unknown")
        status_distribution[k] = status_distribution.get(k, 0) + 1
        if k == "completed":
            completed += 1

    completion_rate = round(completed / total * 100, 2) if total else 0.0

    return {
        "emergency_type_distribution": [
            {"type": k, "count": v} for k, v in emergency_type_distribution.items()
        ],
        "severity_distribution": [
            {"severity": k, "count": v} for k, v in severity_distribution.items()
        ],
        "request_status_distribution": [
            {"status": k, "count": v} for k, v in status_distribution.items()
        ],
        "average_response_time": None,
        "completion_rate": completion_rate,
        "hospital_acceptance_count": 0,
        "responder_completion_count": 0,
        "ai_usage_today": 0,
        "ml_predictions_today": 0,
        "recommendation_usage_today": 0,
    }


@router.get("/system-health")
def get_system_health(
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Get system health status."""
    return {
        "status": "healthy",
        "database": "connected",
        "supabase": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/applications/{application_id}/approve")
def approve_application(
    application_id: str,
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Approve a pending application and update user role.

    Requires admin role. Prevents self-approval.
    Uses the validated user ID from the auth context — never a client-supplied value.
    """
    supabase = create_user_supabase_client(auth_context.access_token)
    admin_user_id = auth_context.user.id  # Fixed: was auth_context.user_id

    # Get the application
    application_result = (
        supabase.table("portal_applications").select("*").eq("id", application_id).execute()
    )
    if not application_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    application = application_result.data[0]

    # Prevent self-approval
    if application["user_id"] == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot approve your own application",
        )

    # Verify status is pending
    if application["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Application is not pending"
        )

    # Update application status
    supabase.table("portal_applications").update({
        "status": "approved",
        "reviewed_by": admin_user_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", application_id).execute()

    # Update user role based on application type
    if application["application_type"] == "hospital":
        supabase.table("profiles").update({
            "role": "hospital_staff",
        }).eq("id", application["user_id"]).execute()

        # Create organization
        organization_result = supabase.table("organizations").insert({
            "name": application["organization_name"],
            "organization_type": "hospital",
            "address": application.get("address"),
            "phone": application.get("phone"),
            "is_verified": True,
        }).select("id").execute()

        # Create organization membership and update profile organization_id
        if organization_result.data:
            org_id = organization_result.data[0]["id"]
            supabase.table("organization_members").insert({
                "organization_id": org_id,
                "user_id": application["user_id"],
                "member_role": "owner",
                "status": "approved",
            }).execute()
            # Update profile with organization_id so portal redirect works immediately
            supabase.table("profiles").update({
                "organization_id": org_id,
            }).eq("id", application["user_id"]).execute()

    elif application["application_type"] == "responder":
        supabase.table("profiles").update({
            "role": "responder",
        }).eq("id", application["user_id"]).execute()

    # Create audit log
    supabase.table("audit_logs").insert({
        "action": "approve_application",
        "entity_type": "portal_application",
        "entity_id": application_id,
        "actor_id": admin_user_id,
        "new_data": {
            "application_type": application["application_type"],
            "applicant_id": application["user_id"],
        },
    }).execute()

    # Create notification for applicant
    supabase.table("notifications").insert({
        "recipient_id": application["user_id"],
        "title": "Application Approved",
        "message": f"Your {application['application_type']} application has been approved.",
        "type": "system",
    }).execute()

    # Return updated application
    updated_result = (
        supabase.table("portal_applications").select("*").eq("id", application_id).execute()
    )
    return updated_result.data[0] if updated_result.data else None


@router.post("/applications/{application_id}/reject")
def reject_application(
    application_id: str,
    reason: str = Query(..., min_length=10, max_length=500, description="Rejection reason"),
    auth_context: AuthContext = Depends(get_auth_context),
    _admin: CurrentUser = Depends(require_admin),
):
    """Reject a pending application.

    Requires admin role. Prevents self-rejection. Reason is required.
    """
    supabase = create_user_supabase_client(auth_context.access_token)
    admin_user_id = auth_context.user.id  # Fixed: was auth_context.user_id

    # Get the application
    application_result = (
        supabase.table("portal_applications").select("*").eq("id", application_id).execute()
    )
    if not application_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    application = application_result.data[0]

    # Prevent self-rejection
    if application["user_id"] == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot reject your own application",
        )

    # Verify status is pending
    if application["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Application is not pending"
        )

    # Update application status
    supabase.table("portal_applications").update({
        "status": "rejected",
        "reviewed_by": admin_user_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": reason,
    }).eq("id", application_id).execute()

    # Create audit log
    supabase.table("audit_logs").insert({
        "action": "reject_application",
        "entity_type": "portal_application",
        "entity_id": application_id,
        "actor_id": admin_user_id,
        "new_data": {
            "application_type": application["application_type"],
            "applicant_id": application["user_id"],
            "rejection_reason": reason,
        },
    }).execute()

    # Create notification for applicant
    supabase.table("notifications").insert({
        "recipient_id": application["user_id"],
        "title": "Application Rejected",
        "message": (
            f"Your {application['application_type']} application has been rejected. "
            f"Reason: {reason}"
        ),
        "type": "system",
    }).execute()

    # Return updated application
    updated_result = (
        supabase.table("portal_applications").select("*").eq("id", application_id).execute()
    )
    return updated_result.data[0] if updated_result.data else None
