-- ═══════════════════════════════════════════════════════════════
--  MATH COLLECTIVE — ANNOUNCEMENT BANNER SETTINGS (migration 44)
--  Run this in Supabase SQL Editor
--
--  The site_notice text has existed since migration 03 but was never
--  rendered. These keys turn it into a real top-of-site banner:
--    banner_enabled   'true' | 'false'  — the admin toggle
--    banner_audience  'guests' | 'all'  — who sees it ('guests' =
--                     logged-out visitors only)
--    banner_style     'ticker' | 'static' — scrolling news-ticker or
--                     fixed text
--  Safe to re-run: ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.site_settings (key, value) VALUES
  ('banner_enabled', 'false'),
  ('banner_audience', 'guests'),
  ('banner_style', 'ticker')
ON CONFLICT (key) DO NOTHING;

-- ── Verify ──
SELECT key, value FROM public.site_settings
WHERE key IN ('banner_enabled', 'banner_audience', 'banner_style', 'site_notice');
