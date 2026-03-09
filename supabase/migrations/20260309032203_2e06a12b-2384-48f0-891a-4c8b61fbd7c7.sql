
-- =============================================
-- 1. REVIEWS TABLE
-- =============================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  restaurant_name text NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  rating numeric NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text text,
  meal_type text DEFAULT 'Dinner',
  best_dish_member text,
  return_choice text,
  photo_url text,
  cuisine text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews: anyone authenticated can read (community reviews)
CREATE POLICY "Authenticated users can read reviews"
ON public.reviews FOR SELECT TO authenticated
USING (true);

-- Reviews: users can insert their own
CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Reviews: users can update their own
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Reviews: users can delete their own
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- 2. USER BADGES TABLE
-- =============================================
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  badge_type text NOT NULL DEFAULT 'individual',
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key, group_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
ON public.user_badges FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own badges"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- 3. GROUP SETTINGS COLUMNS
-- =============================================
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS auto_submit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_repeats boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS repeat_months integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS cutoff_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS allowed_meal_types text[] DEFAULT '{Dinner}',
  ADD COLUMN IF NOT EXISTS res_time_start text DEFAULT '6:00 PM',
  ADD COLUMN IF NOT EXISTS res_time_end text DEFAULT '9:00 PM',
  ADD COLUMN IF NOT EXISTS search_radius integer DEFAULT 10;

-- =============================================
-- 4. REVIEW PHOTOS STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to review-photos
CREATE POLICY "Authenticated users can upload review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-photos');

-- Allow public read of review photos
CREATE POLICY "Public read review photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'review-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own review photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================
-- 5. TIGHTEN RLS POLICIES
-- =============================================

-- Helper function: check if user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- ── GROUPS ──
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public insert access" ON public.groups;
DROP POLICY IF EXISTS "Public read access" ON public.groups;
DROP POLICY IF EXISTS "Public update access" ON public.groups;

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (true);

-- Members can read their own groups
CREATE POLICY "Members can read own groups"
ON public.groups FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), id));

-- Members can update their own groups
CREATE POLICY "Members can update own groups"
ON public.groups FOR UPDATE TO authenticated
USING (public.is_group_member(auth.uid(), id));

-- Also allow reading groups by code (for joining)
CREATE POLICY "Anyone can read groups by code"
ON public.groups FOR SELECT TO authenticated
USING (true);

-- ── MEMBERS ──
DROP POLICY IF EXISTS "Public insert access" ON public.members;
DROP POLICY IF EXISTS "Public read access" ON public.members;
DROP POLICY IF EXISTS "Public update access" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can read members" ON public.members;

-- Authenticated can insert (joining a group)
CREATE POLICY "Authenticated can insert members"
ON public.members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Members can read members in their groups
CREATE POLICY "Members can read group members"
ON public.members FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

-- Members can update own membership
CREATE POLICY "Members can update own membership"
ON public.members FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ── RESTAURANTS ──
DROP POLICY IF EXISTS "Public insert access" ON public.restaurants;
DROP POLICY IF EXISTS "Public read access" ON public.restaurants;
DROP POLICY IF EXISTS "Public update access" ON public.restaurants;

-- Members can insert restaurants to their groups
CREATE POLICY "Members can insert restaurants"
ON public.restaurants FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(auth.uid(), group_id));

-- Members can read restaurants in their groups (+ authenticated can read for community)
CREATE POLICY "Authenticated can read restaurants"
ON public.restaurants FOR SELECT TO authenticated
USING (true);

-- Members can update restaurants in their groups
CREATE POLICY "Members can update restaurants"
ON public.restaurants FOR UPDATE TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

-- ── RESERVATIONS ──
DROP POLICY IF EXISTS "Public insert access" ON public.reservations;
DROP POLICY IF EXISTS "Public read access" ON public.reservations;
DROP POLICY IF EXISTS "Public update access" ON public.reservations;

CREATE POLICY "Members can insert reservations"
ON public.reservations FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can read reservations"
ON public.reservations FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can update reservations"
ON public.reservations FOR UPDATE TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

-- ── MEMBER AVAILABILITY ──
DROP POLICY IF EXISTS "Public insert access" ON public.member_availability;
DROP POLICY IF EXISTS "Public read access" ON public.member_availability;
DROP POLICY IF EXISTS "Public update access" ON public.member_availability;

CREATE POLICY "Members can insert availability"
ON public.member_availability FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = member_availability.member_id
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can read group availability"
ON public.member_availability FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.reservations r ON r.id = member_availability.reservation_id
    WHERE m.group_id = r.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update own availability"
ON public.member_availability FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = member_availability.member_id
    AND members.user_id = auth.uid()
  )
);

-- ── HOST ROTATION HISTORY ──
DROP POLICY IF EXISTS "Public insert access" ON public.host_rotation_history;
DROP POLICY IF EXISTS "Public read access" ON public.host_rotation_history;

CREATE POLICY "Members can insert rotation history"
ON public.host_rotation_history FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can read rotation history"
ON public.host_rotation_history FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

-- ── NOTIFICATIONS ──
DROP POLICY IF EXISTS "Public insert access" ON public.notifications;
DROP POLICY IF EXISTS "Public read access" ON public.notifications;

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = notifications.member_id
    AND members.user_id = auth.uid()
  )
);

-- ── RESERVATION ATTEMPTS ──
DROP POLICY IF EXISTS "Public insert access" ON public.reservation_attempts;
DROP POLICY IF EXISTS "Public read access" ON public.reservation_attempts;
DROP POLICY IF EXISTS "Public update access" ON public.reservation_attempts;

CREATE POLICY "Members can insert reservation attempts"
ON public.reservation_attempts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r
    JOIN public.members m ON m.group_id = r.group_id
    WHERE r.id = reservation_attempts.reservation_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can read reservation attempts"
ON public.reservation_attempts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reservations r
    JOIN public.members m ON m.group_id = r.group_id
    WHERE r.id = reservation_attempts.reservation_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update reservation attempts"
ON public.reservation_attempts FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reservations r
    JOIN public.members m ON m.group_id = r.group_id
    WHERE r.id = reservation_attempts.reservation_id
    AND m.user_id = auth.uid()
  )
);
