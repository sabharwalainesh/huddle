-- 1. Page view tracking
CREATE TABLE public.business_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_views_business ON public.business_views(business_id);
CREATE INDEX idx_business_views_created ON public.business_views(created_at DESC);

ALTER TABLE public.business_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
  ON public.business_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can see views for their businesses"
  ON public.business_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_views.business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can see all views"
  ON public.business_views FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Featured business of the week (admin override)
CREATE TABLE public.featured_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_featured_active ON public.featured_businesses(starts_at, ends_at);

ALTER TABLE public.featured_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Featured businesses are viewable by everyone"
  ON public.featured_businesses FOR SELECT
  USING (true);

CREATE POLICY "Admins can create featured"
  ON public.featured_businesses FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update featured"
  ON public.featured_businesses FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete featured"
  ON public.featured_businesses FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Owner insights summary view
CREATE VIEW public.business_insights_summary
WITH (security_invoker = on) AS
SELECT
  b.id AS business_id,
  b.owner_id,
  b.name,
  b.category,
  b.status,
  b.avg_rating,
  b.review_count,
  COALESCE((SELECT COUNT(*) FROM public.business_views v WHERE v.business_id = b.id), 0) AS total_views,
  COALESCE((SELECT COUNT(DISTINCT v.viewer_id) FROM public.business_views v WHERE v.business_id = b.id AND v.viewer_id IS NOT NULL), 0) AS unique_viewers,
  COALESCE((SELECT COUNT(*) FROM public.business_views v WHERE v.business_id = b.id AND v.created_at > now() - interval '30 days'), 0) AS views_30d,
  COALESCE((SELECT COUNT(*) FROM public.bookmarks bk WHERE bk.business_id = b.id), 0) AS total_bookmarks,
  COALESCE((SELECT COUNT(*) FROM public.check_ins ci WHERE ci.business_id = b.id), 0) AS total_check_ins,
  COALESCE((SELECT COUNT(*) FROM public.check_ins ci WHERE ci.business_id = b.id AND ci.created_at > now() - interval '30 days'), 0) AS check_ins_30d
FROM public.businesses b;