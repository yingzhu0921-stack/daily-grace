-- Restore icon column that was accidentally dropped
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
