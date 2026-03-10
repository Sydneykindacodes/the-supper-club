-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.reservation_status AS ENUM (
  'pending_selection',
  'pending_host_booking',
  'card_required_skipped',
  'confirmed',
  'revealed',
  'completed',
  'cancelled'
);

-- =============================================
-- GROUPS TABLE
-- =============================================
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.groups FOR UPDATE USING (true);

-- =============================================
-- MEMBERS TABLE
-- =============================================
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_color text,
  email text,
  phone text,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  is_host boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.members FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.members FOR UPDATE USING (true);

-- =============================================
-- RESTAURANTS TABLE
-- =============================================
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  cuisine text,
  city text NOT NULL,
  price integer DEFAULT 2,
  google_rating numeric,
  google_review_count integer DEFAULT 0,
  google_place_id text,
  address text,
  sc_rating numeric,
  sc_review_count integer DEFAULT 0,
  requires_card boolean DEFAULT false,
  visited boolean DEFAULT false,
  visited_date text,
  suggested_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.restaurants FOR UPDATE USING (true);

-- =============================================
-- RESERVATIONS TABLE
-- =============================================
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  dinner_date text NOT NULL,
  dinner_time text,
  party_size integer NOT NULL DEFAULT 2,
  status public.reservation_status DEFAULT 'pending_selection',
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  revealed_at timestamptz,
  reveal_at timestamptz,
  host_notified_at timestamptz,
  skip_reason text,
  attempt_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.reservations FOR UPDATE USING (true);

-- =============================================
-- MEMBER AVAILABILITY TABLE
-- =============================================
CREATE TABLE public.member_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  available_dates text[] NOT NULL DEFAULT '{}',
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.member_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.member_availability FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.member_availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.member_availability FOR UPDATE USING (true);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  type text NOT NULL,
  channel text NOT NULL DEFAULT 'app',
  delivered boolean DEFAULT false,
  error text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.notifications FOR INSERT WITH CHECK (true);

-- =============================================
-- RESERVATION ATTEMPTS TABLE
-- =============================================
CREATE TABLE public.reservation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  skipped boolean DEFAULT false,
  skip_reason text,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.reservation_attempts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.reservation_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.reservation_attempts FOR UPDATE USING (true);
