-- Allow authenticated users to delete their own member records (leave group)
CREATE POLICY "Users can delete own membership"
ON public.members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to delete restaurants from groups they belong to
CREATE POLICY "Members can delete restaurants"
ON public.restaurants FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.group_id = restaurants.group_id
    AND members.user_id = auth.uid()
  )
);