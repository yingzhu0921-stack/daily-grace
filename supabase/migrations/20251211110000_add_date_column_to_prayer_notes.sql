-- Add date column to prayer_notes table
ALTER TABLE public.prayer_notes
ADD COLUMN IF NOT EXISTS date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_notes_date ON public.prayer_notes(date);

-- Update existing rows to have date based on created_at
UPDATE public.prayer_notes
SET date = to_char(created_at, 'YYYY-MM-DD')
WHERE date = to_char(now(), 'YYYY-MM-DD');
