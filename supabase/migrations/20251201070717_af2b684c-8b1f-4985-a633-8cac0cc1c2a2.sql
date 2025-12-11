-- Create custom categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  include_in_goal BOOLEAN DEFAULT true,
  active_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create custom records table
CREATE TABLE IF NOT EXISTS public.custom_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on custom_records
ALTER TABLE public.custom_records ENABLE ROW LEVEL SECURITY;

-- Custom records policies
CREATE POLICY "Users can view their own custom records"
  ON public.custom_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom records"
  ON public.custom_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom records"
  ON public.custom_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom records"
  ON public.custom_records FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing fields to existing tables for full feature support
ALTER TABLE public.meditation_notes ADD COLUMN IF NOT EXISTS passage TEXT;
ALTER TABLE public.meditation_notes ADD COLUMN IF NOT EXISTS application TEXT;
ALTER TABLE public.meditation_notes ADD COLUMN IF NOT EXISTS apply_checked BOOLEAN DEFAULT false;
ALTER TABLE public.meditation_notes ADD COLUMN IF NOT EXISTS apply_checked_at TIMESTAMPTZ;
ALTER TABLE public.meditation_notes ADD COLUMN IF NOT EXISTS full_text TEXT;

ALTER TABLE public.prayer_notes ADD COLUMN IF NOT EXISTS answered BOOLEAN DEFAULT false;
ALTER TABLE public.prayer_notes ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_records_user_id ON public.custom_records(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_records_category_id ON public.custom_records(category_id);
CREATE INDEX IF NOT EXISTS idx_custom_records_date ON public.custom_records(date);
CREATE INDEX IF NOT EXISTS idx_meditation_notes_date ON public.meditation_notes(date);
CREATE INDEX IF NOT EXISTS idx_prayer_notes_date ON public.prayer_notes(date);
CREATE INDEX IF NOT EXISTS idx_gratitude_entries_date ON public.gratitude_entries(date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON public.diary_entries(date);

-- Update trigger for categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for custom_records
CREATE TRIGGER update_custom_records_updated_at
  BEFORE UPDATE ON public.custom_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();