-- These helpers are for trusted server code only. Make sure the public Data API
-- roles cannot call them (they would otherwise let one user inflate another
-- user's usage counters).
REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_ai_cache(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_tts_cache(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_ai_cache(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_tts_cache(text) TO service_role;