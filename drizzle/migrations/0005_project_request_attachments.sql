ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "Anyone can upload project files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Admins can read project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.attach_request_files(_tracking_code text, _paths text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.project_requests
  SET attachments = to_jsonb(_paths)
  WHERE tracking_code = _tracking_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_request_files(text, text[]) TO anon, authenticated;