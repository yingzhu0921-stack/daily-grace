-- Create verse_cards table for cloud sync
CREATE TABLE public.verse_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verse_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own verse cards" 
ON public.verse_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verse cards" 
ON public.verse_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verse cards" 
ON public.verse_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verse cards" 
ON public.verse_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_verse_cards_updated_at
BEFORE UPDATE ON public.verse_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();