-- Services used by the recommendation engine
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  support_type TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}',
  delivery_modes TEXT[] NOT NULL DEFAULT '{}',
  motherhood_stages TEXT[] NOT NULL DEFAULT '{}',
  support_tags TEXT[] NOT NULL DEFAULT '{}',
  interaction_tags TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  distance_label TEXT,
  availability TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  priority_level INTEGER NOT NULL DEFAULT 0,
  crisis_capable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone"
ON public.services
FOR SELECT
USING (is_active = true);

CREATE INDEX services_support_type_idx ON public.services (support_type);
CREATE INDEX services_priority_idx ON public.services (priority_level DESC);
CREATE INDEX services_languages_gin_idx ON public.services USING GIN (languages);
CREATE INDEX services_delivery_modes_gin_idx ON public.services USING GIN (delivery_modes);
CREATE INDEX services_stages_gin_idx ON public.services USING GIN (motherhood_stages);
CREATE INDEX services_support_tags_gin_idx ON public.services USING GIN (support_tags);

-- Anonymous and authenticated free-text submissions for AI analysis
CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  detected_language TEXT,
  motherhood_stage TEXT,
  support_types TEXT[] NOT NULL DEFAULT '{}',
  interaction_preferences TEXT[] NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support requests"
ON public.support_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX support_requests_created_at_idx ON public.support_requests (created_at DESC);
CREATE INDEX support_requests_risk_level_idx ON public.support_requests (risk_level);

-- Translation cache for dynamic content
CREATE TABLE public.translation_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_hash, source_language, target_language, provider)
);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translation cache is readable by everyone"
ON public.translation_cache
FOR SELECT
USING (true);

CREATE POLICY "Translation cache inserts are allowed"
ON public.translation_cache
FOR INSERT
WITH CHECK (true);

CREATE INDEX translation_cache_lookup_idx
ON public.translation_cache (source_hash, source_language, target_language, provider);

INSERT INTO public.services (
  name,
  description,
  support_type,
  languages,
  delivery_modes,
  motherhood_stages,
  support_tags,
  interaction_tags,
  location,
  distance_label,
  availability,
  phone,
  email,
  website,
  address,
  rating,
  review_count,
  priority_level,
  crisis_capable
) VALUES
(
  'Perinatal Mental Health Team',
  'Specialist assessment and treatment support for mothers during pregnancy and after birth.',
  'clinical',
  ARRAY['English', 'Arabic', 'Polish'],
  ARRAY['in-person', 'online'],
  ARRAY['pregnant', 'postpartum'],
  ARRAY['emotional', 'clinical'],
  ARRAY['inperson', 'online'],
  'Central London',
  '2.3 miles',
  'Mon-Fri, 9am-5pm',
  '0800 123 4567',
  'help@perinatal.nhs.uk',
  'https://example.com/perinatal-mental-health',
  '45 Wellness Centre, London SE1 2AB',
  4.8,
  124,
  5,
  false
),
(
  'Mama''s Circle Peer Support',
  'Peer-led support sessions for mothers who want understanding, connection, and shared experience.',
  'peer',
  ARRAY['English', 'Polish'],
  ARRAY['online', 'phone'],
  ARRAY['pregnant', 'postpartum'],
  ARRAY['emotional', 'peer'],
  ARRAY['online', 'phone'],
  'Remote',
  NULL,
  'Daily, 8am-10pm',
  '0800 987 6543',
  NULL,
  'https://example.com/mamas-circle',
  NULL,
  4.9,
  89,
  4,
  false
),
(
  'Postpartum Support Group',
  'Weekly facilitated group for mothers who want practical and emotional support after birth.',
  'group',
  ARRAY['English'],
  ARRAY['in-person'],
  ARRAY['postpartum'],
  ARRAY['peer', 'practical', 'emotional'],
  ARRAY['inperson'],
  'East London',
  '4.1 miles',
  'Wednesdays, 10am-12pm',
  NULL,
  'info@postpartumgroup.org',
  'https://example.com/postpartum-group',
  '12 Community Hall, London E1 4AB',
  4.7,
  56,
  3,
  false
),
(
  'Arabic Women''s Support Service',
  'Culturally sensitive counselling and practical support for Arabic-speaking mothers.',
  'counseling',
  ARRAY['Arabic', 'English'],
  ARRAY['in-person', 'online'],
  ARRAY['pregnant', 'postpartum'],
  ARRAY['emotional', 'practical'],
  ARRAY['inperson', 'online'],
  'West London',
  '5.2 miles',
  'Mon-Sat, 9am-6pm',
  '0800 555 1234',
  'support@arabicwomen.org',
  'https://example.com/arabic-support',
  '78 Support Lane, London W2 1JD',
  4.9,
  67,
  5,
  false
),
(
  '24/7 Parent Crisis Line',
  'Immediate emotional support and urgent signposting when a parent feels unsafe or overwhelmed.',
  'crisis',
  ARRAY['English'],
  ARRAY['phone'],
  ARRAY['pregnant', 'postpartum', 'supporter'],
  ARRAY['crisis', 'emotional'],
  ARRAY['phone'],
  'Remote',
  NULL,
  '24/7',
  '111 999 000',
  NULL,
  'https://example.com/crisis-line',
  NULL,
  4.8,
  201,
  6,
  true
);
