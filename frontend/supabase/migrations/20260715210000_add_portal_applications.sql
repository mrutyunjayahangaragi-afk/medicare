-- Migration: Add portal_applications table for hospital/responder application workflow
-- This table tracks applications for hospital and responder portal access

-- Create portal_applications table
CREATE TABLE IF NOT EXISTS public.portal_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_type TEXT NOT NULL CHECK (application_type IN ('hospital', 'responder')),
    organization_name TEXT,
    phone TEXT,
    address TEXT,
    license_or_registration_number TEXT,
    supporting_document_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_portal_applications_user_id ON public.portal_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_applications_status ON public.portal_applications(status);
CREATE INDEX IF NOT EXISTS idx_portal_applications_type ON public.portal_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_portal_applications_reviewed_by ON public.portal_applications(reviewed_by);

-- Enable RLS
ALTER TABLE public.portal_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON public.portal_applications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create own applications"
    ON public.portal_applications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own applications (only non-critical fields)
CREATE POLICY "Users can update own applications"
    ON public.portal_applications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        -- Cannot change status, reviewed_by, reviewed_at
        status = (SELECT status FROM public.portal_applications WHERE id = public.portal_applications.id) AND
        reviewed_by IS NULL AND
        reviewed_at IS NULL
    );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
    ON public.portal_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all applications (including status changes)
CREATE POLICY "Admins can update all applications"
    ON public.portal_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portal_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER portal_applications_updated_at
    BEFORE UPDATE ON public.portal_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_portal_applications_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.portal_applications TO authenticated;
GRANT SELECT, UPDATE ON public.portal_applications TO anon;
