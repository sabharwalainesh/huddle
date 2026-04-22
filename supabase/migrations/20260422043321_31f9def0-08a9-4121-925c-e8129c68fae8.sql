-- Drop overly broad SELECT policy that allowed bucket listing
DROP POLICY IF EXISTS "Videos bucket is publicly readable" ON storage.objects;

-- Keep public read by URL (Supabase public-bucket signed URLs work fine without listing)
-- We re-create a SELECT policy scoped so signed-in owners can still read their own metadata,
-- and public reads continue to work via the public bucket's CDN endpoint.
CREATE POLICY "Owners can read their own video files"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );