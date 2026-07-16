from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.admin import AdminRepository
from app.schemas.admin import (
    AdminDashboardStats,
    AdminApplicationResponse,
    AdminUserListResponse,
    AdminUserDetailResponse,
    AdminHospitalResponse,
    AdminResponderResponse,
    AdminEmergencyRequestResponse,
    AdminOrganizationResponse,
    AdminAuditLogResponse,
    AdminAnalyticsResponse,
    AdminSystemHealthResponse,
)
from app.models.profile import Profile
from app.models.portal_application import PortalApplication
from app.models.organization import Organization
from app.models.emergency_request import EmergencyRequest
from app.models.audit_log import AuditLog


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = AdminRepository(db)

    async def get_dashboard_stats(self) -> AdminDashboardStats:
        """Get platform statistics for admin dashboard."""
        stats = await self.repository.get_dashboard_stats()
        return AdminDashboardStats(**stats)

    async def get_applications(
        self,
        status: Optional[str] = None,
        application_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminApplicationResponse], int]:
        """Get paginated list of portal applications."""
        applications, total = await self.repository.get_applications(
            status=status,
            application_type=application_type,
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for app in applications:
            # Get user email and name from profile
            user = await self.repository.get_user_by_id(app.user_id)
            response_list.append(AdminApplicationResponse(
                id=str(app.id),
                user_id=str(app.user_id),
                application_type=app.application_type,
                organization_name=app.organization_name,
                phone=app.phone,
                address=app.address,
                license_or_registration_number=app.license_or_registration_number,
                status=app.status,
                reviewed_by=str(app.reviewed_by) if app.reviewed_by else None,
                reviewed_at=app.reviewed_at,
                rejection_reason=app.rejection_reason,
                created_at=app.created_at,
                updated_at=app.updated_at,
                user_email=user.email if user else None,
                user_name=user.full_name if user else None,
            ))
        
        return response_list, total

    async def get_application_by_id(self, application_id: str) -> Optional[AdminApplicationResponse]:
        """Get a specific application by ID."""
        application = await self.repository.get_application_by_id(application_id)
        if not application:
            return None
        
        user = await self.repository.get_user_by_id(application.user_id)
        return AdminApplicationResponse(
            id=str(application.id),
            user_id=str(application.user_id),
            application_type=application.application_type,
            organization_name=application.organization_name,
            phone=application.phone,
            address=application.address,
            license_or_registration_number=application.license_or_registration_number,
            status=application.status,
            reviewed_by=str(application.reviewed_by) if application.reviewed_by else None,
            reviewed_at=application.reviewed_at,
            rejection_reason=application.rejection_reason,
            created_at=application.created_at,
            updated_at=application.updated_at,
            user_email=user.email if user else None,
            user_name=user.full_name if user else None,
        )

    async def get_users(
        self,
        role: Optional[str] = None,
        account_status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminUserListResponse], int]:
        """Get paginated list of users."""
        users, total = await self.repository.get_users(
            role=role,
            account_status=account_status,
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for user in users:
            # Get emergency request count
            emergency_count = await self.repository.get_user_emergency_count(user.id)
            
            # Get organization info if applicable
            organization_name = None
            if user.role in ["hospital_staff", "responder", "volunteer"]:
                # TODO: Get organization from organization_members
                pass
            
            response_list.append(AdminUserListResponse(
                id=str(user.id),
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                role=user.role,
                account_status=user.account_status,
                created_at=user.created_at,
                last_sign_in_at=user.last_sign_in_at,
                emergency_request_count=emergency_count,
                organization_name=organization_name,
            ))
        
        return response_list, total

    async def get_user_by_id(self, user_id: str) -> Optional[AdminUserDetailResponse]:
        """Get a specific user by ID."""
        user = await self.repository.get_user_by_id(user_id)
        if not user:
            return None
        
        emergency_count = await self.repository.get_user_emergency_count(user.id)
        
        # Get organization info
        organization_name = None
        organization_id = None
        organization_role = None
        # TODO: Get organization from organization_members
        
        return AdminUserDetailResponse(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            account_status=user.account_status,
            created_at=user.created_at,
            last_sign_in_at=user.last_sign_in_at,
            emergency_request_count=emergency_count,
            organization_name=organization_name,
            organization_id=str(organization_id) if organization_id else None,
            organization_role=organization_role,
            avatar_url=user.avatar_url,
            is_verified=user.is_verified,
        )

    async def get_hospitals(
        self,
        is_verified: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminHospitalResponse], int]:
        """Get paginated list of hospitals."""
        hospitals, total = await self.repository.get_hospitals(
            is_verified=is_verified,
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for hospital in hospitals:
            staff_count = await self.repository.get_hospital_staff_count(hospital.id)
            active_requests = await self.repository.get_hospital_active_requests(hospital.id)
            
            response_list.append(AdminHospitalResponse(
                id=str(hospital.id),
                name=hospital.name,
                organization_type=hospital.organization_type,
                is_verified=hospital.is_verified,
                address=hospital.address,
                phone=hospital.phone,
                staff_count=staff_count,
                bed_capacity=hospital.bed_capacity,
                available_ambulances=hospital.available_ambulances or 0,
                active_requests=active_requests,
                created_at=hospital.created_at,
                updated_at=hospital.updated_at,
            ))
        
        return response_list, total

    async def get_hospital_by_id(self, hospital_id: str) -> Optional[AdminHospitalResponse]:
        """Get a specific hospital by ID."""
        hospital = await self.repository.get_hospital_by_id(hospital_id)
        if not hospital:
            return None
        
        staff_count = await self.repository.get_hospital_staff_count(hospital.id)
        active_requests = await self.repository.get_hospital_active_requests(hospital.id)
        
        return AdminHospitalResponse(
            id=str(hospital.id),
            name=hospital.name,
            organization_type=hospital.organization_type,
            is_verified=hospital.is_verified,
            address=hospital.address,
            phone=hospital.phone,
            staff_count=staff_count,
            bed_capacity=hospital.bed_capacity,
            available_ambulances=hospital.available_ambulances or 0,
            active_requests=active_requests,
            created_at=hospital.created_at,
            updated_at=hospital.updated_at,
        )

    async def get_responders(
        self,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminResponderResponse], int]:
        """Get paginated list of responders."""
        responders, total = await self.repository.get_responders(
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for responder in responders:
            completed_count = await self.repository.get_responder_completed_count(responder.id)
            
            # Get organization info
            organization_name = None
            # TODO: Get organization from organization_members
            
            # Get active assignment
            active_assignment = None
            # TODO: Get active assignment from emergency_requests
            
            response_list.append(AdminResponderResponse(
                id=str(responder.id),
                full_name=responder.full_name,
                email=responder.email,
                phone=responder.phone,
                responder_type=None,  # TODO: Get from profile or organization
                organization_name=organization_name,
                availability_status=responder.availability_status or "offline",
                approval_status="approved",  # TODO: Get from application or membership
                active_assignment=active_assignment,
                completed_request_count=completed_count,
                created_at=responder.created_at,
                account_status=responder.account_status,
            ))
        
        return response_list, total

    async def get_responder_by_id(self, responder_id: str) -> Optional[AdminResponderResponse]:
        """Get a specific responder by ID."""
        responder = await self.repository.get_responder_by_id(responder_id)
        if not responder:
            return None
        
        completed_count = await self.repository.get_responder_completed_count(responder.id)
        
        return AdminResponderResponse(
            id=str(responder.id),
            full_name=responder.full_name,
            email=responder.email,
            phone=responder.phone,
            responder_type=None,
            organization_name=None,
            availability_status=responder.availability_status or "offline",
            approval_status="approved",
            active_assignment=None,
            completed_request_count=completed_count,
            created_at=responder.created_at,
            account_status=responder.account_status,
        )

    async def get_emergency_requests(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminEmergencyRequestResponse], int]:
        """Get paginated list of emergency requests."""
        requests, total = await self.repository.get_emergency_requests(
            status=status,
            severity=severity,
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for req in requests:
            # Get user name
            user = await self.repository.get_user_by_id(req.user_id)
            
            # Get assigned responder name
            responder_name = None
            if req.assigned_responder_id:
                responder = await self.repository.get_responder_by_id(req.assigned_responder_id)
                responder_name = responder.full_name if responder else None
            
            # Get recommended hospital name
            hospital_name = None
            if req.recommended_hospital_id:
                hospital = await self.repository.get_hospital_by_id(req.recommended_hospital_id)
                hospital_name = hospital.name if hospital else None
            
            response_list.append(AdminEmergencyRequestResponse(
                id=str(req.id),
                user_id=str(req.user_id),
                user_name=user.full_name if user else None,
                emergency_type=req.emergency_type,
                severity=req.severity,
                status=req.status,
                assigned_responder_id=str(req.assigned_responder_id) if req.assigned_responder_id else None,
                assigned_responder_name=responder_name,
                recommended_hospital_id=str(req.recommended_hospital_id) if req.recommended_hospital_id else None,
                recommended_hospital_name=hospital_name,
                created_at=req.created_at,
                updated_at=req.updated_at,
                completed_at=req.completed_at,
                location_label=req.location_label,
            ))
        
        return response_list, total

    async def get_emergency_request_by_id(self, request_id: str) -> Optional[AdminEmergencyRequestResponse]:
        """Get a specific emergency request by ID."""
        request = await self.repository.get_emergency_request_by_id(request_id)
        if not request:
            return None
        
        user = await self.repository.get_user_by_id(request.user_id)
        
        responder_name = None
        if request.assigned_responder_id:
            responder = await self.repository.get_responder_by_id(request.assigned_responder_id)
            responder_name = responder.full_name if responder else None
        
        hospital_name = None
        if request.recommended_hospital_id:
            hospital = await self.repository.get_hospital_by_id(request.recommended_hospital_id)
            hospital_name = hospital.name if hospital else None
        
        return AdminEmergencyRequestResponse(
            id=str(request.id),
            user_id=str(request.user_id),
            user_name=user.full_name if user else None,
            emergency_type=request.emergency_type,
            severity=request.severity,
            status=request.status,
            assigned_responder_id=str(request.assigned_responder_id) if request.assigned_responder_id else None,
            assigned_responder_name=responder_name,
            recommended_hospital_id=str(request.recommended_hospital_id) if request.recommended_hospital_id else None,
            recommended_hospital_name=hospital_name,
            created_at=request.created_at,
            updated_at=request.updated_at,
            completed_at=request.completed_at,
            location_label=request.location_label,
        )

    async def get_organizations(
        self,
        organization_type: Optional[str] = None,
        is_verified: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminOrganizationResponse], int]:
        """Get paginated list of organizations."""
        organizations, total = await self.repository.get_organizations(
            organization_type=organization_type,
            is_verified=is_verified,
            search=search,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for org in organizations:
            member_count = await self.repository.get_organization_member_count(org.id)
            
            # Get owner name
            owner_name = None
            # TODO: Get owner from organization_members where role = admin
            
            response_list.append(AdminOrganizationResponse(
                id=str(org.id),
                name=org.name,
                organization_type=org.organization_type,
                is_verified=org.is_verified,
                owner_id=str(org.owner_id) if org.owner_id else None,
                owner_name=owner_name,
                member_count=member_count,
                active_responders=0,  # TODO: Calculate
                active_requests=0,  # TODO: Calculate
                created_at=org.created_at,
                updated_at=org.updated_at,
            ))
        
        return response_list, total

    async def get_organization_by_id(self, organization_id: str) -> Optional[AdminOrganizationResponse]:
        """Get a specific organization by ID."""
        organization = await self.repository.get_organization_by_id(organization_id)
        if not organization:
            return None
        
        member_count = await self.repository.get_organization_member_count(organization.id)
        
        return AdminOrganizationResponse(
            id=str(organization.id),
            name=organization.name,
            organization_type=organization.organization_type,
            is_verified=organization.is_verified,
            owner_id=str(organization.owner_id) if organization.owner_id else None,
            owner_name=None,
            member_count=member_count,
            active_responders=0,
            active_requests=0,
            created_at=organization.created_at,
            updated_at=organization.updated_at,
        )

    async def get_audit_logs(
        self,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AdminAuditLogResponse], int]:
        """Get paginated list of audit logs."""
        logs, total = await self.repository.get_audit_logs(
            action=action,
            entity_type=entity_type,
            page=page,
            page_size=page_size
        )
        
        response_list = []
        for log in logs:
            # Get actor name
            actor_name = None
            if log.actor_id:
                actor = await self.repository.get_user_by_id(log.actor_id)
                actor_name = actor.full_name if actor else None
            
            response_list.append(AdminAuditLogResponse(
                id=str(log.id),
                actor_id=str(log.actor_id) if log.actor_id else None,
                actor_name=actor_name,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=str(log.entity_id) if log.entity_id else None,
                old_data=log.old_data,
                new_data=log.new_data,
                request_id=log.request_id,
                created_at=log.created_at,
            ))
        
        return response_list, total

    async def get_analytics(self) -> AdminAnalyticsResponse:
        """Get platform analytics data."""
        analytics = await self.repository.get_analytics()
        return AdminAnalyticsResponse(**analytics)

    async def get_system_health(self) -> AdminSystemHealthResponse:
        """Get system health status."""
        # TODO: Implement actual health checks
        return AdminSystemHealthResponse(
            frontend="healthy",
            fastapi="healthy",
            database="healthy",
            realtime="healthy",
            ai_assistant="healthy",
            ml_model="healthy",
        )
