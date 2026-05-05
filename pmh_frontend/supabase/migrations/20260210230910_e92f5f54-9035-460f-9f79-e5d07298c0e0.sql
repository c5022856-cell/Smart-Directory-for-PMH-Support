
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  age INTEGER,
  phone TEXT,
  email TEXT,
  preferred_language TEXT DEFAULT 'en',
  motherhood_stage TEXT,
  support_types TEXT[] DEFAULT '{}',
  interaction_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  event_date TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL DEFAULT 'online',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);

-- Create event registrations table
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register for events" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unregister" ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);

-- Create call schedules table
CREATE TABLE public.call_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supporter_name TEXT NOT NULL,
  call_time TEXT NOT NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_mode TEXT NOT NULL DEFAULT 'immediate',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calls" ON public.call_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can schedule calls" ON public.call_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calls" ON public.call_schedules FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Seed some events
INSERT INTO public.events (title, topic, description, language, event_date, mode) VALUES
('Postnatal Wellness Workshop', 'Emotional Support', 'A gentle session on managing emotions after birth.', 'en', now() + interval '3 days', 'online'),
('ورشة دعم الأمهات', 'Practical Support', 'جلسة دعم عملي للأمهات الجدد', 'ar', now() + interval '5 days', 'online'),
('Spotkanie Mam', 'Peer Support', 'Spotkanie grupy wsparcia dla mam', 'pl', now() + interval '7 days', 'in-person'),
('Anxiety & New Motherhood', 'Clinical Support', 'Understanding anxiety in the perinatal period.', 'en', now() + interval '10 days', 'online'),
('Breastfeeding Support Circle', 'Practical Support', 'Tips and peer support for breastfeeding challenges.', 'en', now() + interval '14 days', 'in-person');
