-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM members
  WHERE members.id = notifications.member_id
  AND members.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM members
  WHERE members.id = notifications.member_id
  AND members.user_id = auth.uid()
));