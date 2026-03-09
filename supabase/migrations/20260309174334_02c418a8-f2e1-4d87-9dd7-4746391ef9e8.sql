ALTER TABLE public.profiles
ADD COLUMN phone text,
ADD COLUMN sms_enabled boolean DEFAULT false,
ADD COLUMN push_enabled boolean DEFAULT false;