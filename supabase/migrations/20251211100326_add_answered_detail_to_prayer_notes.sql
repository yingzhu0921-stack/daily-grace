-- Add answered_detail and answered_at columns to prayer_notes table
ALTER TABLE public.prayer_notes ADD COLUMN IF NOT EXISTS answered_detail TEXT;
ALTER TABLE public.prayer_notes ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
