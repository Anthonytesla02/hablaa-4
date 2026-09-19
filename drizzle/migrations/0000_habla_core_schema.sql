CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign text NOT NULL DEFAULT 'Learner',
  lang_id text NOT NULL DEFAULT 'es',
  persona_id text NOT NULL DEFAULT '',
  tier_id text NOT NULL DEFAULT '',
  timeline_id text NOT NULL DEFAULT '',
  badges text[] NOT NULL DEFAULT '{}',
  credits integer NOT NULL DEFAULT 0,
  freezes integer NOT NULL DEFAULT 0,
  ghost_seed integer NOT NULL DEFAULT 0,
  league_tier integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  perfect_week boolean NOT NULL DEFAULT false,
  quests jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  shadow_reps integer NOT NULL DEFAULT 0,
  started_at bigint NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  sts_streak integer NOT NULL DEFAULT 0,
  weekly_xp integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  last_active_day text,
  last_login_day text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.srs_cards (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  target text NOT NULL,
  translation text NOT NULL,
  lang text NOT NULL,
  due_at bigint NOT NULL,
  ease real NOT NULL DEFAULT 2.5,
  interval_days real NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_cards TO authenticated;
GRANT ALL ON public.srs_cards TO service_role;
ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards" ON public.srs_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.completed_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.completed_days TO authenticated;
GRANT ALL ON public.completed_days TO service_role;
ALTER TABLE public.completed_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own days" ON public.completed_days FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key text NOT NULL,
  date bigint NOT NULL,
  accuracy real NOT NULL DEFAULT 0,
  items integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  cover_intact boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_history TO authenticated;
GRANT ALL ON public.session_history TO service_role;
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.session_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign text NOT NULL DEFAULT 'Learner',
  kind text NOT NULL DEFAULT 'streak',
  body text NOT NULL DEFAULT '',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feed_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed readable" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "feed insert own" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feed update own" ON public.feed_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feed delete own" ON public.feed_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER feed_posts_updated_at BEFORE UPDATE ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();