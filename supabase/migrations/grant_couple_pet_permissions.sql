-- Allow authenticated users to reach the couple pet tables.
-- Row level security policies still restrict access to each partner pair.

GRANT SELECT, INSERT, UPDATE ON TABLE public.couple_pets TO authenticated;
GRANT SELECT, INSERT ON TABLE public.pet_feed_logs TO authenticated;
