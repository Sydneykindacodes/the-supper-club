
CREATE POLICY "Authenticated users can read all individual badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (badge_type = 'individual');
