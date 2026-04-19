
-- 1) Asegurar columna published en news
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
UPDATE public.news SET published = true WHERE published IS NULL;

-- 2) Bucket público "media"
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Políticas storage
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_auth_insert_own" ON storage.objects;
CREATE POLICY "media_auth_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "media_auth_update_own" ON storage.objects;
CREATE POLICY "media_auth_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "media_auth_delete_own" ON storage.objects;
CREATE POLICY "media_auth_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);
