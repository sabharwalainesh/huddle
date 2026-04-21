-- 1. Roles enum + user_roles table (security-definer pattern, no recursion)
CREATE TYPE public.app_role AS ENUM ('admin', 'business_owner', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users see their own roles; admins see/manage all
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can grant roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Bootstrap admin: auto-grant admin role to sabharwalainesh@gmail.com on signup
-- Also auto-grants business_owner role flag-based onboarding will use a profile flag instead
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owns_business BOOLEAN NOT NULL DEFAULT false;

-- Replace handle_new_user to also grant admin role to the bootstrap email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, owns_business)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'owns_business')::boolean, false)
  );

  IF lower(NEW.email) = 'sabharwalainesh@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Business approval pipeline
CREATE TYPE public.business_status AS ENUM ('draft','pending','under_review','approved','rejected');
CREATE TYPE public.ai_review_status AS ENUM ('not_run','passed','flagged','error');

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS status business_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS proof_document_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_status ai_review_status NOT NULL DEFAULT 'not_run',
  ADD COLUMN IF NOT EXISTS ai_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Pre-existing seeded businesses should remain visible
UPDATE public.businesses SET status = 'approved' WHERE status = 'draft';

-- 4. Replace public-read RLS so customers only see approved
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;

CREATE POLICY "Approved businesses are viewable by everyone"
  ON public.businesses FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Owners can view their own businesses at any status"
  ON public.businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all businesses"
  ON public.businesses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Owners can update their own (already exists); add admin update for approval workflow
CREATE POLICY "Admins can update any business"
  ON public.businesses FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Storage bucket for proof documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-proofs', 'business-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owner uploads/reads own folder; admins read all
CREATE POLICY "Owners can upload their own proof documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can read their own proof documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can update their own proof documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can read all proof documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-proofs'
    AND public.has_role(auth.uid(), 'admin')
  );