-- Migration: Add admin RPC functions and audit logging
-- This migration adds secure server-side functions for admin operations

-- Add account status field to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended'));
    END IF;
END $$;

-- Add audit_logs table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    request_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only system can insert audit logs (via triggers/functions)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Drop existing functions if exists to avoid ambiguity (drop all overloads)
DROP FUNCTION IF EXISTS public.write_audit_log CASCADE;
DROP FUNCTION IF EXISTS public.approve_portal_application CASCADE;
DROP FUNCTION IF EXISTS public.reject_portal_application CASCADE;
DROP FUNCTION IF EXISTS public.suspend_user CASCADE;
DROP FUNCTION IF EXISTS public.reactivate_user CASCADE;
DROP FUNCTION IF EXISTS public.change_user_role CASCADE;

-- Function to write audit logs
CREATE FUNCTION public.write_audit_log(
    p_actor_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        request_id
    ) VALUES (
        p_actor_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_data,
        p_new_data,
        p_request_id
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on audit function
GRANT EXECUTE ON FUNCTION public.write_audit_log(UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT) TO authenticated;

-- Function to approve portal application
CREATE FUNCTION public.approve_portal_application(
    p_application_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_application RECORD;
    v_profile RECORD;
    v_organization_id UUID;
    v_log_id UUID;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;
    
    -- Lock and fetch application
    SELECT * INTO v_application
    FROM public.portal_applications
    WHERE id = p_application_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not pending';
    END IF;
    
    -- Update application status
    UPDATE public.portal_applications
    SET 
        status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = now()
    WHERE id = p_application_id;
    
    -- Update user role based on application type
    IF v_application.application_type = 'hospital' THEN
        -- Update profile to hospital_staff
        UPDATE public.profiles
        SET role = 'hospital_staff'
        WHERE id = v_application.user_id;
        
        -- Create or update organization
        INSERT INTO public.organizations (
            name,
            organization_type,
            address,
            phone,
            is_verified,
            created_at,
            updated_at
        ) VALUES (
            v_application.organization_name,
            'hospital',
            v_application.address,
            v_application.phone,
            true,
            now(),
            now()
        ) ON CONFLICT (name) DO UPDATE SET
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            is_verified = true,
            updated_at = now()
        RETURNING id INTO v_organization_id;
        
        -- Create organization membership
        INSERT INTO public.organization_members (
            user_id,
            organization_id,
            role,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_application.user_id,
            v_organization_id,
            'admin',
            'approved',
            now(),
            now()
        ) ON CONFLICT DO NOTHING;
        
    ELSIF v_application.application_type = 'responder' THEN
        -- Update profile to responder
        UPDATE public.profiles
        SET role = 'responder'
        WHERE id = v_application.user_id;
        
        -- Create organization if organization_name provided
        IF v_application.organization_name IS NOT NULL THEN
            INSERT INTO public.organizations (
                name,
                organization_type,
                address,
                phone,
                is_verified,
                created_at,
                updated_at
            ) VALUES (
                v_application.organization_name,
                'responder',
                v_application.address,
                v_application.phone,
                true,
                now(),
                now()
            ) ON CONFLICT (name) DO UPDATE SET
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                is_verified = true,
                updated_at = now()
            RETURNING id INTO v_organization_id;
            
            -- Create organization membership
            INSERT INTO public.organization_members (
                user_id,
                organization_id,
                role,
                status,
                created_at,
                updated_at
            ) VALUES (
                v_application.user_id,
                v_organization_id,
                'member',
                'approved',
                now(),
                now()
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Write audit log
    SELECT public.write_audit_log(
        p_admin_id,
        'application_approved',
        'portal_application',
        p_application_id,
        jsonb_build_object('status', v_application.status),
        jsonb_build_object('status', 'approved', 'application_type', v_application.application_type),
        NULL
    ) INTO v_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'audit_log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to reject portal application
CREATE FUNCTION public.reject_portal_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_application RECORD;
    v_log_id UUID;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;
    
    -- Validate rejection reason
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 10 OR length(p_rejection_reason) > 500 THEN
        RAISE EXCEPTION 'Rejection reason must be between 10 and 500 characters';
    END IF;
    
    -- Lock and fetch application
    SELECT * INTO v_application
    FROM public.portal_applications
    WHERE id = p_application_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not pending';
    END IF;
    
    -- Update application status
    UPDATE public.portal_applications
    SET 
        status = 'rejected',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        rejection_reason = p_rejection_reason
    WHERE id = p_application_id;
    
    -- Write audit log
    SELECT public.write_audit_log(
        p_admin_id,
        'application_rejected',
        'portal_application',
        p_application_id,
        jsonb_build_object('status', v_application.status),
        jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason),
        NULL
    ) INTO v_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'audit_log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to suspend user
CREATE FUNCTION public.suspend_user(
    p_user_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_log_id UUID;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;
    
    -- Prevent suspending the last admin
    IF p_user_id = p_admin_id THEN
        RAISE EXCEPTION 'Cannot suspend yourself';
    END IF;
    
    -- Check if this is the last active admin
    DECLARE
        v_admin_count INT;
    BEGIN
        SELECT COUNT(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin' AND account_status = 'active' AND id != p_user_id;
        
        IF v_admin_count = 0 THEN
            RAISE EXCEPTION 'Cannot suspend the last active admin';
        END IF;
    END;
    
    -- Lock and fetch profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_profile.account_status = 'suspended' THEN
        RAISE EXCEPTION 'User is already suspended';
    END IF;
    
    -- Update account status
    UPDATE public.profiles
    SET account_status = 'suspended'
    WHERE id = p_user_id;
    
    -- Write audit log
    SELECT public.write_audit_log(
        p_admin_id,
        'user_suspended',
        'profile',
        p_user_id,
        jsonb_build_object('account_status', v_profile.account_status),
        jsonb_build_object('account_status', 'suspended', 'reason', p_reason),
        NULL
    ) INTO v_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'audit_log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to reactivate user
CREATE FUNCTION public.reactivate_user(
    p_user_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_log_id UUID;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;
    
    -- Lock and fetch profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_profile.account_status = 'active' THEN
        RAISE EXCEPTION 'User is already active';
    END IF;
    
    -- Update account status
    UPDATE public.profiles
    SET account_status = 'active'
    WHERE id = p_user_id;
    
    -- Write audit log
    SELECT public.write_audit_log(
        p_admin_id,
        'user_reactivated',
        'profile',
        p_user_id,
        jsonb_build_object('account_status', v_profile.account_status),
        jsonb_build_object('account_status', 'active'),
        NULL
    ) INTO v_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'audit_log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to change user role
CREATE FUNCTION public.change_user_role(
    p_user_id UUID,
    p_admin_id UUID,
    p_new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_log_id UUID;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;
    
    -- Validate new role
    IF p_new_role NOT IN ('user', 'responder', 'volunteer', 'hospital_staff', 'admin') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;
    
    -- Prevent user from promoting themselves to admin
    IF p_user_id = p_admin_id AND p_new_role = 'admin' THEN
        RAISE EXCEPTION 'Cannot promote yourself to admin';
    END IF;
    
    -- Prevent demoting the last admin
    IF p_new_role != 'admin' THEN
        DECLARE
            v_admin_count INT;
        BEGIN
            SELECT COUNT(*) INTO v_admin_count
            FROM public.profiles
            WHERE role = 'admin' AND account_status = 'active' AND id != p_user_id;
            
            IF v_admin_count = 0 THEN
                RAISE EXCEPTION 'Cannot remove the last active admin';
            END IF;
        END;
    END IF;
    
    -- Lock and fetch profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_profile.role = p_new_role THEN
        RAISE EXCEPTION 'User already has this role';
    END IF;
    
    -- Update role
    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_user_id;
    
    -- Write audit log
    SELECT public.write_audit_log(
        p_admin_id,
        'role_changed',
        'profile',
        p_user_id,
        jsonb_build_object('role', v_profile.role),
        jsonb_build_object('role', p_new_role),
        NULL
    ) INTO v_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'new_role', p_new_role,
        'audit_log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute on admin functions to authenticated users
-- (Role checks are done inside the functions)
GRANT EXECUTE ON FUNCTION approve_portal_application TO authenticated;
GRANT EXECUTE ON FUNCTION reject_portal_application TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_role TO authenticated;

-- Add index for account_status on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, account_status);

-- Add index for organization verification
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON public.organizations(is_verified, organization_type);
