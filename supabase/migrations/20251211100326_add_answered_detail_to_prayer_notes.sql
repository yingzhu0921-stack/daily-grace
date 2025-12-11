-- Add answered_detail column to prayer_notes table
ALTER TABLE public.prayer_notes ADD COLUMN IF NOT EXISTS answered_detail TEXT;
