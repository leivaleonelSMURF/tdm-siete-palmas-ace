
-- ============= PHASE 1: SCHEMA, RLS, REALTIME, ELO, ADMIN BOOTSTRAP =============

-- ---------- TABLES ----------
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  rating int NOT NULL DEFAULT 1000,
  avatar_url text,
  phone text,
  bio text,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  format text NOT NULL DEFAULT 'single_elimination',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','finished')),
  starts_at timestamptz,
  location text DEFAULT 'Club Siete Palmas',
  max_players int DEFAULT 16,
  prize text,
  challonge_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  player2_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  player1_score int DEFAULT 0,
  player2_score int DEFAULT 0,
  winner_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  set_scores jsonb DEFAULT '[]'::jsonb,
  round text,
  match_order int DEFAULT 0,
  next_match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  challenged_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed','expired','cancelled')),
  message text,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','confirmed','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_players ON public.matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_created ON public.matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_player_unread ON public.notifications(player_id, read);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON public.challenges(challenged_id, status);
CREATE INDEX IF NOT EXISTS idx_players_rating ON public.players(rating DESC);

-- ---------- HELPER FUNCTIONS ----------
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.players WHERE user_id = _uid LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ---------- AUTO-CREATE PLAYER ON SIGNUP + ADMIN BOOTSTRAP ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_seed_admin boolean := (NEW.email = 'leivaleonel2019@gmail.com');
BEGIN
  INSERT INTO public.players (user_id, full_name, is_admin, rating)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    is_seed_admin,
    1000
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- ELO + AUTO STATS UPDATE ON MATCH RESULT ----------
CREATE OR REPLACE FUNCTION public.apply_match_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winner_rating int;
  loser_rating int;
  loser_id uuid;
  expected_winner numeric;
  k_factor int := 32;
  rating_change int;
  next_m public.matches%ROWTYPE;
BEGIN
  -- Only act when winner is being set (was null, now set) or changed
  IF NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.winner_id IS NOT DISTINCT FROM NEW.winner_id THEN
    RETURN NEW;
  END IF;

  loser_id := CASE WHEN NEW.winner_id = NEW.player1_id THEN NEW.player2_id ELSE NEW.player1_id END;
  IF loser_id IS NULL THEN RETURN NEW; END IF;

  SELECT rating INTO winner_rating FROM public.players WHERE id = NEW.winner_id;
  SELECT rating INTO loser_rating FROM public.players WHERE id = loser_id;

  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  rating_change := round(k_factor * (1 - expected_winner));

  UPDATE public.players SET rating = rating + rating_change, wins = wins + 1 WHERE id = NEW.winner_id;
  UPDATE public.players SET rating = GREATEST(100, rating - rating_change), losses = losses + 1 WHERE id = loser_id;

  -- Notifications
  INSERT INTO public.notifications (player_id, type, title, message, link)
  VALUES
    (NEW.winner_id, 'match_result', 'Ganaste tu partido', 'Sumaste +' || rating_change || ' de rating', '/jugador/' || NEW.winner_id),
    (loser_id, 'match_result', 'Resultado cargado', 'Perdiste ' || rating_change || ' de rating', '/jugador/' || loser_id);

  -- Auto-advance winner to next match
  IF NEW.next_match_id IS NOT NULL THEN
    SELECT * INTO next_m FROM public.matches WHERE id = NEW.next_match_id;
    IF next_m.player1_id IS NULL THEN
      UPDATE public.matches SET player1_id = NEW.winner_id WHERE id = NEW.next_match_id;
    ELSIF next_m.player2_id IS NULL THEN
      UPDATE public.matches SET player2_id = NEW.winner_id WHERE id = NEW.next_match_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_match_result ON public.matches;
CREATE TRIGGER trg_apply_match_result
  AFTER INSERT OR UPDATE OF winner_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.apply_match_result();

-- ---------- CHALLENGE NOTIFICATION ----------
CREATE OR REPLACE FUNCTION public.notify_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenger_name text;
BEGIN
  SELECT full_name INTO challenger_name FROM public.players WHERE id = NEW.challenger_id;
  INSERT INTO public.notifications (player_id, type, title, message, link)
  VALUES (NEW.challenged_id, 'challenge', 'Nuevo desafío', challenger_name || ' te desafió', '/desafios');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_challenge ON public.challenges;
CREATE TRIGGER trg_notify_challenge
  AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.notify_challenge();

-- ---------- VIEW: player_stats ----------
CREATE OR REPLACE VIEW public.player_stats
WITH (security_invoker = true)
AS
SELECT
  p.id, p.user_id, p.full_name, p.rating, p.avatar_url, p.is_admin, p.bio, p.created_at,
  p.wins, p.losses,
  (p.wins + p.losses) AS total_matches,
  CASE WHEN (p.wins + p.losses) > 0
    THEN round((p.wins::numeric / (p.wins + p.losses)) * 100, 1)
    ELSE 0 END AS win_pct
FROM public.players p;

-- ---------- ROW LEVEL SECURITY ----------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PLAYERS: public read, self-update (NOT is_admin), admin full
DROP POLICY IF EXISTS "players_select_all" ON public.players;
CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "players_update_self" ON public.players;
CREATE POLICY "players_update_self" ON public.players
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_admin = (SELECT is_admin FROM public.players WHERE user_id = auth.uid())
    AND rating  = (SELECT rating  FROM public.players WHERE user_id = auth.uid())
    AND wins    = (SELECT wins    FROM public.players WHERE user_id = auth.uid())
    AND losses  = (SELECT losses  FROM public.players WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "players_admin_all" ON public.players;
CREATE POLICY "players_admin_all" ON public.players
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- TOURNAMENTS: public read, admin write
DROP POLICY IF EXISTS "tournaments_select_all" ON public.tournaments;
CREATE POLICY "tournaments_select_all" ON public.tournaments FOR SELECT USING (true);
DROP POLICY IF EXISTS "tournaments_admin_all" ON public.tournaments;
CREATE POLICY "tournaments_admin_all" ON public.tournaments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- MATCHES: public read, admin write
DROP POLICY IF EXISTS "matches_select_all" ON public.matches;
CREATE POLICY "matches_select_all" ON public.matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "matches_admin_all" ON public.matches;
CREATE POLICY "matches_admin_all" ON public.matches
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- NEWS: public read published, admin all
DROP POLICY IF EXISTS "news_select_published" ON public.news;
CREATE POLICY "news_select_published" ON public.news FOR SELECT USING (published = true OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "news_admin_all" ON public.news;
CREATE POLICY "news_admin_all" ON public.news
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- CHALLENGES
DROP POLICY IF EXISTS "challenges_select_involved" ON public.challenges;
CREATE POLICY "challenges_select_involved" ON public.challenges
  FOR SELECT TO authenticated
  USING (
    challenger_id = public.current_player_id()
    OR challenged_id = public.current_player_id()
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "challenges_insert_self" ON public.challenges;
CREATE POLICY "challenges_insert_self" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (challenger_id = public.current_player_id());

DROP POLICY IF EXISTS "challenges_update_involved" ON public.challenges;
CREATE POLICY "challenges_update_involved" ON public.challenges
  FOR UPDATE TO authenticated
  USING (
    challenger_id = public.current_player_id()
    OR challenged_id = public.current_player_id()
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "challenges_admin_delete" ON public.challenges;
CREATE POLICY "challenges_admin_delete" ON public.challenges
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- TOURNAMENT REGISTRATIONS
DROP POLICY IF EXISTS "regs_select_all" ON public.tournament_registrations;
CREATE POLICY "regs_select_all" ON public.tournament_registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "regs_insert_self" ON public.tournament_registrations;
CREATE POLICY "regs_insert_self" ON public.tournament_registrations
  FOR INSERT TO authenticated
  WITH CHECK (player_id = public.current_player_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "regs_delete_self_or_admin" ON public.tournament_registrations;
CREATE POLICY "regs_delete_self_or_admin" ON public.tournament_registrations
  FOR DELETE TO authenticated
  USING (player_id = public.current_player_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "regs_update_admin" ON public.tournament_registrations;
CREATE POLICY "regs_update_admin" ON public.tournament_registrations
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select_self" ON public.notifications;
CREATE POLICY "notifications_select_self" ON public.notifications
  FOR SELECT TO authenticated
  USING (player_id = public.current_player_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_update_self" ON public.notifications;
CREATE POLICY "notifications_update_self" ON public.notifications
  FOR UPDATE TO authenticated
  USING (player_id = public.current_player_id())
  WITH CHECK (player_id = public.current_player_id());

DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_admin_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- REALTIME ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
