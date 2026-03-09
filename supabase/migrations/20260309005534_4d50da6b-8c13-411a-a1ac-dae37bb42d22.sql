-- Add host rotation tracking to members
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS host_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_hosted_at timestamp with time zone;

-- Add next host tracking and booking URL to reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS next_host_id uuid REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS next_host_notified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS booking_url text;

-- Create host_rotation_history table to track full cycles
CREATE TABLE IF NOT EXISTS public.host_rotation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  hosted_at timestamp with time zone DEFAULT now(),
  cycle_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on host_rotation_history
ALTER TABLE public.host_rotation_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for host_rotation_history
CREATE POLICY "Public read access" ON public.host_rotation_history FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.host_rotation_history FOR INSERT WITH CHECK (true);