ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS idx_businesses_lat_lng
  ON public.businesses (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;