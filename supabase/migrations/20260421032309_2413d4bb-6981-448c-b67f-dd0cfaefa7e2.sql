CREATE TABLE public.google_place_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE,
  place_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_place_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Google place cache is viewable by everyone"
ON public.google_place_cache FOR SELECT
USING (true);

CREATE TRIGGER update_google_place_cache_updated_at
BEFORE UPDATE ON public.google_place_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_google_place_cache_business_id ON public.google_place_cache(business_id);