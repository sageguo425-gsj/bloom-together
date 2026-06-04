UPDATE public.couple_pets
SET hunger = 0
WHERE last_fed_at IS NULL
  AND hunger <> 0;
