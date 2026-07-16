from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.profile import Profile
from app.models.emergency_request import EmergencyRequest
from app.models.portal_application import PortalApplication
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.audit_log import AuditLog


class AdminRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self) -> Dict[str, int]:
        """Get platform statistics for admin dashboard."""
        total_users = await self.db.scalar(select(func.count(Profile.id)))
        
        total_responders = await self.db.scalar(
            select(func.count(Profile.id)).where(
                Profile.role.in_(["responder", "volunteer"])
            )
        )
        
        total_hospitals = await self.db.scalar(
            select(func.count(Organization.id)).where(
                Organization.organization_type == "hospital"
            )
        )
        
        total_emergency_requests = await self.db.scalar(
            select(func.count(EmergencyRequest.id))
        )
        
        active_emergencies = await self.db.scalar(
            select(func.count(EmergencyRequest.id)).where(
                EmergencyRequest.status.in_(["accepted", "in_progress", "arrived"])
            )
        )
        
        pending_applications = await self.db.scalar(
            select(func.count(PortalApplication.id)).where(
                PortalApplication.status == "pending"
            )
        )
        
        critical_requests = await self.db.scalar(
            select(func.count(EmergencyRequest.id)).where(
                and_(
                    EmergencyRequest.severity == "critical",
                    EmergencyRequest.status.notin_(["completed", "cancelled"])
                )
            )
        )
        
        completed_requests = await self.db.scalar(
            select(func.count(EmergencyRequest.id)).where(
                EmergencyRequest.status == "completed"
            )
        )
        
        suspended_accounts = await self.db.scalar(
            select(func.count(Profile.id)).where(
                Profile.account_status == "suspended"
            )
        )
        
        return {
            "total_users": total_users or 0,
            "total_responders": total_responders or 0,
            "total_hospitals": total_hospitals or 0,
            "total_emergency_requests": total_emergency_requests or 0,
            "active_emergencies": active_emergencies or 0,
            "pending_applications": pending_applications or 0,
            "critical_requests": critical_requests or 0,
            "completed_requests": completed_requests or 0,
            "suspended_accounts": suspended_accounts or 0,
            "pending_account_deletions": 0,  # TODO: Implement account deletion requests
        }

    async def get_applications(
        self,
        status: Optional[str] = None,
        application_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[PortalApplication], int]:
        """Get paginated list of portal applications."""
        query = select(PortalApplication)
        
        if status:
            query = query.where(PortalApplication.status == status)
        
        if application_type:
            query = query.where(PortalApplication.application_type == application_type)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    PortalApplication.organization_name.ilike(search_pattern),
                    PortalApplication.license_or_registration_number.ilike(search_pattern),
                )
            )
        
        query = query.order_by(PortalApplication.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        applications = result.scalars().all()
        
        return list(applications), total or 0

    async def get_application_by_id(self, application_id: str) -> Optional[PortalApplication]:
        """Get a specific application by ID."""
        query = select(PortalApplication).where(PortalApplication.id == application_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_users(
        self,
        role: Optional[str] = None,
        account_status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Profile], int]:
        """Get paginated list of users."""
        query = select(Profile)
        
        if role:
            query = query.where(Profile.role == role)
        
        if account_status:
            query = query.where(Profile.account_status == account_status)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Profile.full_name.ilike(search_pattern),
                    Profile.email.ilike(search_pattern),
                    Profile.phone.ilike(search_pattern),
                )
            )
        
        query = query.order_by(Profile.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        return list(users), total or 0

    async def get_user_by_id(self, user_id: str) -> Optional[Profile]:
        """Get a specific user by ID."""
        query = select(Profile).where(Profile.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_emergency_count(self, user_id: str) -> int:
        """Get the number of emergency requests for a user."""
        query = select(func.count(EmergencyRequest.id)).where(
            EmergencyRequest.user_id == user_id
        )
        result = await self.db.scalar(query)
        return result or 0

    async def get_hospitals(
        self,
        is_verified: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Organization], int]:
        """Get paginated list of hospitals."""
        query = select(Organization).where(
            Organization.organization_type == "hospital"
        )
        
        if is_verified is not None:
            query = query.where(Organization.is_verified == is_verified)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(Organization.name.ilike(search_pattern))
        
        query = query.order_by(Organization.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        hospitals = result.scalars().all()
        
        return list(hospitals), total or 0

    async def get_hospital_by_id(self, hospital_id: str) -> Optional[Organization]:
        """Get a specific hospital by ID."""
        query = select(Organization).where(
            and_(
                Organization.id == hospital_id,
                Organization.organization_type == "hospital"
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_hospital_staff_count(self, hospital_id: str) -> int:
        """Get the number of staff for a hospital."""
        query = select(func.count(OrganizationMember.id)).where(
            and_(
                OrganizationMember.organization_id == hospital_id,
                OrganizationMember.status == "approved"
            )
        )
        result = await self.db.scalar(query)
        return result or 0

    async def get_hospital_active_requests(self, hospital_id: str) -> int:
        """Get the number of active emergency requests for a hospital."""
        query = select(func.count(EmergencyRequest.id)).where(
            and_(
                EmergencyRequest.recommended_hospital_id == hospital_id,
                EmergencyRequest.status.in_(["accepted", "in_progress", "arrived"])
            )
        )
        result = await self.db.scalar(query)
        return result or 0

    async def get_responders(
        self,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Profile], int]:
        """Get paginated list of responders."""
        query = select(Profile).where(
            Profile.role.in_(["responder", "volunteer"])
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Profile.full_name.ilike(search_pattern),
                    Profile.email.ilike(search_pattern),
                )
            )
        
        query = query.order_by(Profile.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        responders = result.scalars().all()
        
        return list(responders), total or 0

    async def get_responder_by_id(self, responder_id: str) -> Optional[Profile]:
        """Get a specific responder by ID."""
        query = select(Profile).where(
            and_(
                Profile.id == responder_id,
                Profile.role.in_(["responder", "volunteer"])
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_responder_completed_count(self, responder_id: str) -> int:
        """Get the number of completed requests for a responder."""
        query = select(func.count(EmergencyRequest.id)).where(
            and_(
                EmergencyRequest.assigned_responder_id == responder_id,
                EmergencyRequest.status == "completed"
            )
        )
        result = await self.db.scalar(query)
        return result or 0

    async def get_emergency_requests(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[EmergencyRequest], int]:
        """Get paginated list of emergency requests."""
        query = select(EmergencyRequest)
        
        if status:
            query = query.where(EmergencyRequest.status == status)
        
        if severity:
            query = query.where(EmergencyRequest.severity == severity)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    EmergencyRequest.id.ilike(search_pattern),
                    EmergencyRequest.description.ilike(search_pattern),
                    EmergencyRequest.location_label.ilike(search_pattern),
                )
            )
        
        query = query.order_by(EmergencyRequest.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        requests = result.scalars().all()
        
        return list(requests), total or 0

    async def get_emergency_request_by_id(self, request_id: str) -> Optional[EmergencyRequest]:
        """Get a specific emergency request by ID."""
        query = select(EmergencyRequest).where(EmergencyRequest.id == request_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_organizations(
        self,
        organization_type: Optional[str] = None,
        is_verified: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Organization], int]:
        """Get paginated list of organizations."""
        query = select(Organization)
        
        if organization_type:
            query = query.where(Organization.organization_type == organization_type)
        
        if is_verified is not None:
            query = query.where(Organization.is_verified == is_verified)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(Organization.name.ilike(search_pattern))
        
        query = query.order_by(Organization.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        organizations = result.scalars().all()
        
        return list(organizations), total or 0

    async def get_organization_by_id(self, organization_id: str) -> Optional[Organization]:
        """Get a specific organization by ID."""
        query = select(Organization).where(Organization.id == organization_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_organization_member_count(self, organization_id: str) -> int:
        """Get the number of members in an organization."""
        query = select(func.count(OrganizationMember.id)).where(
            and_(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.status == "approved"
            )
        )
        result = await self.db.scalar(query)
        return result or 0

    async def get_audit_logs(
        self,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AuditLog], int]:
        """Get paginated list of audit logs."""
        query = select(AuditLog)
        
        if action:
            query = query.where(AuditLog.action == action)
        
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
        
        query = query.order_by(AuditLog.created_at.desc())
        
        total_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_query)
        
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        logs = result.scalars().all()
        
        return list(logs), total or 0

    async def get_analytics(self) -> Dict[str, Any]:
        """Get platform analytics data."""
        # Emergency requests by day (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        requests_by_day = await self.db.execute(
            select(
                func.date(EmergencyRequest.created_at).label('date'),
                func.count(EmergencyRequest.id).label('count')
            ).where(
                EmergencyRequest.created_at >= thirty_days_ago
            ).group_by(
                func.date(EmergencyRequest.created_at)
            ).order_by(
                func.date(EmergencyRequest.created_at)
            )
        )
        
        emergency_type_distribution = await self.db.execute(
            select(
                EmergencyRequest.emergency_type,
                func.count(EmergencyRequest.id).label('count')
            ).group_by(EmergencyRequest.emergency_type)
        )
        
        severity_distribution = await self.db.execute(
            select(
                EmergencyRequest.severity,
                func.count(EmergencyRequest.id).label('count')
            ).group_by(EmergencyRequest.severity)
        )
        
        status_distribution = await self.db.execute(
            select(
                EmergencyRequest.status,
                func.count(EmergencyRequest.id).label('count')
            ).group_by(EmergencyRequest.status)
        )
        
        # Calculate completion rate
        total_requests = await self.db.scalar(select(func.count(EmergencyRequest.id)))
        completed_requests = await self.db.scalar(
            select(func.count(EmergencyRequest.id)).where(
                EmergencyRequest.status == "completed"
            )
        )
        completion_rate = (completed_requests / total_requests * 100) if total_requests else 0
        
        return {
            "emergency_requests_by_day": [
                {"date": str(row.date), "count": row.count}
                for row in requests_by_day
            ],
            "emergency_type_distribution": [
                {"type": row.emergency_type, "count": row.count}
                for row in emergency_type_distribution
            ],
            "severity_distribution": [
                {"severity": row.severity, "count": row.count}
                for row in severity_distribution
            ],
            "request_status_distribution": [
                {"status": row.status, "count": row.count}
                for row in status_distribution
            ],
            "average_response_time": None,  # TODO: Implement
            "completion_rate": round(completion_rate, 2),
            "hospital_acceptance_count": 0,  # TODO: Implement
            "responder_completion_count": 0,  # TODO: Implement
            "ai_usage_today": 0,  # TODO: Implement
            "ml_predictions_today": 0,  # TODO: Implement
            "recommendation_usage_today": 0,  # TODO: Implement
        }
