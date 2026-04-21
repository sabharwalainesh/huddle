DROP VIEW IF EXISTS public.active_coupons;
CREATE VIEW public.active_coupons
WITH (security_invoker = true)
AS
SELECT id, business_id, owner_id, title, description, discount, code, expires_at, created_at, updated_at
FROM public.coupons
WHERE expires_at > now();

DROP VIEW IF EXISTS public.trending_pulse;
CREATE VIEW public.trending_pulse
WITH (security_invoker = true)
AS
SELECT
  b.id AS business_id,
  b.name,
  b.category,
  b.image_url,
  b.avg_rating,
  COALESCE((SELECT COUNT(*) FROM public.check_ins ci WHERE ci.business_id = b.id AND ci.created_at > now() - interval '7 days'), 0) AS recent_check_ins,
  COALESCE((SELECT COUNT(*) FROM public.bookmarks bk WHERE bk.business_id = b.id AND bk.created_at > now() - interval '7 days'), 0) AS recent_bookmarks,
  (
    COALESCE((SELECT COUNT(*) FROM public.check_ins ci WHERE ci.business_id = b.id AND ci.created_at > now() - interval '7 days'), 0) * 2
    + COALESCE((SELECT COUNT(*) FROM public.bookmarks bk WHERE bk.business_id = b.id AND bk.created_at > now() - interval '7 days'), 0)
  )::numeric AS pulse_score
FROM public.businesses b
WHERE b.status = 'approved';