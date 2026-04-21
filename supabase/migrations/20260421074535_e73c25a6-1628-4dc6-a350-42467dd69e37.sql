-- Create a private storage bucket for review receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder: receipts/{user_id}/...
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own receipts
CREATE POLICY "Users can read their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own receipts (e.g. retry)
CREATE POLICY "Users can delete their own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);