-- Shared couple pet feeding rules and realtime sync support.
-- Beef and cake limits are shared by the couple per Shanghai calendar day.

GRANT SELECT, INSERT, UPDATE ON TABLE public.couple_pets TO authenticated;
GRANT SELECT, INSERT ON TABLE public.pet_feed_logs TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couple_pets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_pets;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.feed_couple_pet(
  p_pet_id UUID,
  p_food_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  pet_record public.couple_pets%ROWTYPE;
  user_record public.users%ROWTYPE;
  food_cost INTEGER;
  growth_delta INTEGER;
  hunger_delta INTEGER;
  happiness_delta INTEGER;
  daily_feed_limit INTEGER;
  daily_feed_count INTEGER;
  available_exp INTEGER;
  updated_pet public.couple_pets%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT *
  INTO pet_record
  FROM public.couple_pets
  WHERE id = p_pet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pet_not_found';
  END IF;

  IF current_user_id <> pet_record.user1_id AND current_user_id <> pet_record.user2_id THEN
    RAISE EXCEPTION 'not_pet_partner';
  END IF;

  SELECT *
  INTO user_record
  FROM public.users
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  CASE p_food_type
    WHEN 'bone' THEN
      food_cost := 1;
      growth_delta := 1;
      hunger_delta := 8;
      happiness_delta := 1;
      daily_feed_limit := NULL;
    WHEN 'beef' THEN
      food_cost := 5;
      growth_delta := 8;
      hunger_delta := 30;
      happiness_delta := 5;
      daily_feed_limit := 3;
    WHEN 'cake' THEN
      food_cost := 10;
      growth_delta := 20;
      hunger_delta := 15;
      happiness_delta := 20;
      daily_feed_limit := 2;
    ELSE
      RAISE EXCEPTION 'invalid_food_type';
  END CASE;

  IF daily_feed_limit IS NOT NULL THEN
    SELECT COUNT(*)
    INTO daily_feed_count
    FROM public.pet_feed_logs
    WHERE pet_id = p_pet_id
      AND food_type = p_food_type
      AND created_at >= (date_trunc('day', timezone('Asia/Shanghai', NOW())) AT TIME ZONE 'Asia/Shanghai')
      AND created_at < ((date_trunc('day', timezone('Asia/Shanghai', NOW())) + INTERVAL '1 day') AT TIME ZONE 'Asia/Shanghai');

    IF daily_feed_count >= daily_feed_limit THEN
      IF p_food_type = 'beef' THEN
        RAISE EXCEPTION 'daily_beef_limit_reached';
      END IF;

      IF p_food_type = 'cake' THEN
        RAISE EXCEPTION 'daily_cake_limit_reached';
      END IF;
    END IF;
  END IF;

  available_exp := COALESCE(user_record.exp, 0) - COALESCE(user_record.exp_spent, 0);

  IF available_exp < food_cost THEN
    RAISE EXCEPTION 'insufficient_exp';
  END IF;

  UPDATE public.users
  SET exp_spent = COALESCE(exp_spent, 0) + food_cost
  WHERE id = current_user_id;

  UPDATE public.couple_pets
  SET
    growth = growth + growth_delta,
    hunger = LEAST(100, hunger + hunger_delta),
    happiness = LEAST(100, happiness + happiness_delta),
    last_fed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_pet_id
  RETURNING * INTO updated_pet;

  INSERT INTO public.pet_feed_logs (
    pet_id,
    user_id,
    food_type,
    exp_cost,
    growth_gain,
    hunger_gain,
    happiness_gain
  )
  VALUES (
    p_pet_id,
    current_user_id,
    p_food_type,
    food_cost,
    growth_delta,
    hunger_delta,
    happiness_delta
  );

  RETURN jsonb_build_object(
    'pet', to_jsonb(updated_pet),
    'available_exp', available_exp - food_cost,
    'exp_spent', COALESCE(user_record.exp_spent, 0) + food_cost,
    'growth_gain', growth_delta,
    'hunger_gain', hunger_delta,
    'happiness_gain', happiness_delta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.feed_couple_pet(UUID, TEXT) TO authenticated;
