
-- Fix groups insert policy - restrict to authenticated (already is, but make it check user is authenticated explicitly)
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix notifications insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
