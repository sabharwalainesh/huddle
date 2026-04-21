-- Cluster demo businesses around Austin, TX with deterministic small offsets
DO $$
DECLARE
  base_lat double precision := 30.2672;
  base_lng double precision := -97.7431;
BEGIN
  UPDATE public.businesses b
  SET
    lat = base_lat + ((('x' || substr(md5(b.id::text), 1, 8))::bit(32)::int % 1000)::double precision / 50000.0),
    lng = base_lng + ((('x' || substr(md5(b.id::text || 'lng'), 1, 8))::bit(32)::int % 1000)::double precision / 50000.0)
  WHERE b.lat IS NULL AND b.lng IS NULL AND b.status = 'approved';
END $$;