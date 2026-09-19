-- Universal, server-only caches shared by every user.
-- No RLS policies are created on purpose: these tables are reachable ONLY
-- through trusted server code using the service role. The Data API (anon /
-- authenticated) can neither read nor write them.

CREATE TABLE public.tts_cache (
  cache_key text PRIMARY KEY,
  storage_path text NOT NULL,
  voice text NOT NULL DEFAULT '',
  speed real NOT NULL DEFAULT 1,
  text_preview text NOT NULL DEFAULT '',
  byte_size integer NOT NULL DEFAULT 0,
  hits bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tts_cache TO service_role;
ALTER TABLE public.tts_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_cache (
  cache_key text PRIMARY KEY,
  feature text NOT NULL,
  payload jsonb NOT NULL,
  hits bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_cache TO service_role;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_cache_feature_idx ON public.ai_cache (feature);

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key text NOT NULL,
  feature text NOT NULL,
  used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_key, feature)
);
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Atomic per-user daily quota. Safe under concurrency: the upsert increments
-- inside a single statement, so simultaneous requests cannot overshoot.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id uuid, _feature text, _limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _used integer;
BEGIN
  INSERT INTO public.ai_usage (user_id, day_key, feature, used)
  VALUES (_user_id, to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD'), _feature, 1)
  ON CONFLICT (user_id, day_key, feature)
  DO UPDATE SET used = public.ai_usage.used + 1, updated_at = now()
  RETURNING used INTO _used;

  RETURN _used <= _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) TO service_role;

-- Cache bookkeeping helpers (service role only).
CREATE OR REPLACE FUNCTION public.touch_ai_cache(_cache_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_cache SET hits = hits + 1, last_used_at = now() WHERE cache_key = _cache_key;
$$;
REVOKE ALL ON FUNCTION public.touch_ai_cache(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_ai_cache(text) TO service_role;

CREATE OR REPLACE FUNCTION public.touch_tts_cache(_cache_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tts_cache SET hits = hits + 1, last_used_at = now() WHERE cache_key = _cache_key;
$$;
REVOKE ALL ON FUNCTION public.touch_tts_cache(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_tts_cache(text) TO service_role;