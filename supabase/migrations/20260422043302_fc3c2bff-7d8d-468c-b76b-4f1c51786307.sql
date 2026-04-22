-- Videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  category TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  like_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_created_at ON public.videos (created_at DESC);
CREATE INDEX idx_videos_business ON public.videos (business_id);
CREATE INDEX idx_videos_user ON public.videos (user_id);
CREATE INDEX idx_videos_category ON public.videos (category);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON public.videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create videos"
  ON public.videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any video"
  ON public.videos FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any video"
  ON public.videos FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate caption length & video URL via trigger (avoids non-immutable CHECKs)
CREATE OR REPLACE FUNCTION public.validate_video()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.caption) > 500 THEN
    RAISE EXCEPTION 'Caption must be 500 characters or fewer';
  END IF;
  IF NEW.video_url IS NULL OR length(trim(NEW.video_url)) = 0 THEN
    RAISE EXCEPTION 'Video URL is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_video_trigger
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.validate_video();

-- Video likes
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

CREATE INDEX idx_video_likes_video ON public.video_likes (video_id);
CREATE INDEX idx_video_likes_user ON public.video_likes (user_id);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.video_likes FOR SELECT USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.video_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

-- Maintain like_count
CREATE OR REPLACE FUNCTION public.recalc_video_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.video_id, OLD.video_id);
  UPDATE public.videos
    SET like_count = (SELECT COUNT(*) FROM public.video_likes WHERE video_id = target)
    WHERE id = target;
  RETURN NULL;
END;
$$;

CREATE TRIGGER video_likes_count_trigger
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.recalc_video_like_count();

-- Video views
CREATE TABLE public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  viewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_views_video ON public.video_views (video_id);
CREATE INDEX idx_video_views_created ON public.video_views (created_at);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a video view"
  ON public.video_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can see views for their videos"
  ON public.video_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_views.video_id AND v.user_id = auth.uid())
  );

CREATE POLICY "Admins can see all video views"
  ON public.video_views FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Maintain view_count
CREATE OR REPLACE FUNCTION public.increment_video_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
    SET view_count = view_count + 1
    WHERE id = NEW.video_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER video_views_count_trigger
  AFTER INSERT ON public.video_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_view_count();

-- Storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600, -- 100MB
  ARRAY['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp']
);

CREATE POLICY "Videos bucket is publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload to their folder in videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files in videos"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files in videos"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );