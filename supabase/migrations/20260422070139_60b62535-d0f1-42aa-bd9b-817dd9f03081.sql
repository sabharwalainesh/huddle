DROP FUNCTION IF EXISTS public.validate_video() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_video_like_count() CASCADE;
DROP FUNCTION IF EXISTS public.increment_video_view_count() CASCADE;

DROP TABLE IF EXISTS public.video_likes CASCADE;
DROP TABLE IF EXISTS public.video_views CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;