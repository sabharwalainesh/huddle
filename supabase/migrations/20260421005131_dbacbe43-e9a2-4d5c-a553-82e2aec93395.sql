-- Add verified flag to reviews for "Verified Visit" badge
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Check-ins for "Small Biz Pulse" live trending widget
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_recent ON public.check_ins (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_business_recent ON public.check_ins (business_id, created_at DESC);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Check-ins are viewable by everyone"
  ON public.check_ins FOR SELECT USING (true);

CREATE POLICY "Authenticated users can check in"
  ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trending businesses view: aggregates check-ins + bookmarks in the last hour
CREATE OR REPLACE VIEW public.trending_pulse
WITH (security_invoker = true) AS
SELECT
  b.id AS business_id,
  b.name,
  b.category,
  b.image_url,
  b.avg_rating,
  COALESCE(ci.recent_check_ins, 0) AS recent_check_ins,
  COALESCE(bm.recent_bookmarks, 0) AS recent_bookmarks,
  COALESCE(ci.recent_check_ins, 0) * 2 + COALESCE(bm.recent_bookmarks, 0) AS pulse_score
FROM public.businesses b
LEFT JOIN (
  SELECT business_id, COUNT(*)::int AS recent_check_ins
  FROM public.check_ins
  WHERE created_at > now() - interval '1 hour'
  GROUP BY business_id
) ci ON ci.business_id = b.id
LEFT JOIN (
  SELECT business_id, COUNT(*)::int AS recent_bookmarks
  FROM public.bookmarks
  WHERE created_at > now() - interval '1 hour'
  GROUP BY business_id
) bm ON bm.business_id = b.id
WHERE COALESCE(ci.recent_check_ins, 0) + COALESCE(bm.recent_bookmarks, 0) > 0
ORDER BY pulse_score DESC;