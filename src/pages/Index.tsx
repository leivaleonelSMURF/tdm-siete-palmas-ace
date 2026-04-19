import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight, Crown, Flame, Trophy, Calendar, ArrowRight,
  Swords, BarChart3, Users, ArrowUpRight, Bell,
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, Zap, LogIn,
  AlertTriangle, Activity, Image as ImageIcon, Instagram, Mail, MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWeather, weatherLabel } from "@/hooks/useWeather";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Sparkline } from "@/components/Sparkline";
import { PaddleIllustration } from "@/components/PaddleIllustration";
import { BracketWithLines } from "@/components/BracketWithLines";
import { NewsCategoryBadge } from "@/components/NewsCategoryBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

type PlayerRow = {
  id: string; full_name: string; rating: number;
  avatar_url: string | null; wins: number; losses: number;
};
type MatchRow = {
  id: string; tournament_id: string | null;
  player1_id: string | null; player2_id: string | null;
  player1_score: number | null; player2_score: number | null;
  winner_id: string | null; round: string | null; match_order: number | null;
  set_scores: any; created_at: string; next_match_id: string | null;
};
type TournamentRow = {
  id: string; name: string; status: string; starts_at: string | null;
  format: string;
};
type NewsRow = { id: string; title: string; content: string; image_url: string | null; created_at: string };

function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const cls = "size-4";
  if (code === 0) return <Sun className={cn(cls, isDay ? "text-warning" : "text-muted-foreground")} />;
  if ([1, 2, 3, 45, 48].includes(code)) return <Cloud className={cls} />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className={cls} />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className={cls} />;
  if ([95, 96, 99].includes(code)) return <Zap className={cls} />;
  return <CloudFog className={cls} />;
}

function calcStreak(playerId: string, matches: MatchRow[]): number {
  let s = 0;
  const mine = matches
    .filter(m => m.winner_id && (m.player1_id === playerId || m.player2_id === playerId))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  for (const m of mine) { if (m.winner_id === playerId) s++; else break; }
  return s;
}

function buildSparkValues(p: PlayerRow, matches: MatchRow[]): number[] {
  const mine = matches
    .filter(m => m.winner_id && (m.player1_id === p.id || m.player2_id === p.id))
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    .slice(-12);
  if (mine.length === 0) return [p.rating, p.rating];
  let r = p.rating - mine.length * 4;
  const out: number[] = [r];
  for (const m of mine) {
    r += m.winner_id === p.id ? 6 : -4;
    out.push(r);
  }
  return out;
}

function PodiumCard({
  player, displayIdx, matchesForSpark, delay,
}: {
  player: PlayerRow; displayIdx: number; matchesForSpark: MatchRow[]; delay: string;
}) {
  const realRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
  const platforms = ["bg-silver", "bg-gold", "bg-bronze"];
  const platformH = ["h-16", "h-24", "h-10"];
  const topPad = ["pt-8", "pt-2", "pt-14"];
  const spark = useMemo(() => buildSparkValues(player, matchesForSpark), [player, matchesForSpark]);
  const textShadow = "drop-shadow(0 1px 1px rgba(0,0,0,0.3))";
  return (
    <div className={cn("flex flex-col items-center animate-slide-up", topPad[displayIdx])} style={{ animationDelay: delay }}>
      <Link to={`/jugador/${player.id}`} className="w-full glass-card glass-card-hover p-3 md:p-4 text-center">
        <div className="relative inline-block">
          <Avatar name={player.full_name} url={player.avatar_url} size={56} ring />
          {realRank === 1 && (
            <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 size-5 text-warning fill-warning drop-shadow" aria-label="Primer lugar" />
          )}
        </div>
        <div className="mt-2 font-heading font-semibold text-sm truncate">{player.full_name}</div>
        <div className="text-xs text-muted-foreground tabular-nums">{player.rating}</div>
        <div className="mt-1.5 flex justify-center">
          <Sparkline values={spark} width={80} height={20} />
        </div>
      </Link>
      <div className={cn("w-full rounded-t-lg mt-2 grid place-items-center text-primary-foreground font-heading font-bold", platformH[displayIdx], platforms[displayIdx])} style={{ textShadow }}>
        {realRank}°
      </div>
    </div>
  );
}

function PlayerSide({ player, winner, reverse }: { player: PlayerRow | null; winner: boolean; reverse?: boolean }) {
  if (!player) return <div className="flex-1 text-sm text-muted-foreground italic">A definir</div>;
  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", reverse && "flex-row-reverse text-right")}>
      <Avatar name={player.full_name} url={player.avatar_url} size={36} />
      <div className="min-w-0">
        <Link to={`/jugador/${player.id}`} className="font-medium text-sm truncate hover:text-primary transition-colors block">
          {player.full_name}
        </Link>
        {winner && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
            <Trophy className="size-3" /> Ganó
          </span>
        )}
      </div>
    </div>
  );
}

const Index = () => {
  const { player, user } = useAuth();
  const { weather } = useWeather();

  const [topPlayers, setTopPlayers] = useState<PlayerRow[] | null>(null);
  const [extraPlayers, setExtraPlayers] = useState<PlayerRow[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchRow[] | null>(null);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(true);
  const [allMatchesForStreaks, setAllMatchesForStreaks] = useState<MatchRow[]>([]);
  const [counts, setCounts] = useState({ players: 0, matches: 0, tournaments: 0 });
  const [upcoming, setUpcoming] = useState<TournamentRow | null>(null);
  const [active, setActive] = useState<TournamentRow | null>(null);
  const [activeMatches, setActiveMatches] = useState<MatchRow[]>([]);
  const [loadingActiveTournament, setLoadingActiveTournament] = useState(true);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchOfDay, setMatchOfDay] = useState<MatchRow | null>(null);

  // Refs para realtime
  const topPlayersRef = useRef<PlayerRow[]>([]);
  const extraPlayersRef = useRef<PlayerRow[]>([]);
  useEffect(() => { topPlayersRef.current = topPlayers ?? []; }, [topPlayers]);
  useEffect(() => { extraPlayersRef.current = extraPlayers; }, [extraPlayers]);

  const playersById = useMemo(() => {
    const map: Record<string, PlayerRow> = {};
    [...(topPlayers ?? []), ...extraPlayers].forEach(p => { map[p.id] = p; });
    return map;
  }, [topPlayers, extraPlayers]);

  const fetchMissingPlayers = useCallback(async (
    knownIds: Set<string>,
    matchesArrays: MatchRow[][],
  ) => {
    const missing = new Set<string>();
    matchesArrays.forEach(arr =>
      arr.forEach(m => {
        if (m.player1_id && !knownIds.has(m.player1_id)) missing.add(m.player1_id);
        if (m.player2_id && !knownIds.has(m.player2_id)) missing.add(m.player2_id);
      })
    );
    if (missing.size === 0) {
      if (extraPlayers.length > 0) setExtraPlayers([]);
      return;
    }
    const { data } = await supabase
      .from("players")
      .select("id, full_name, rating, avatar_url, wins, losses")
      .in("id", Array.from(missing));
    const newPlayers = (data as PlayerRow[]) ?? [];
    const currentIds = new Set(extraPlayers.map(p => p.id));
    const hasChanges = newPlayers.length !== extraPlayers.length || newPlayers.some(p => !currentIds.has(p.id));
    if (hasChanges) setExtraPlayers(newPlayers);
  }, [extraPlayers]);

  const fetchTopPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("id, full_name, rating, avatar_url, wins, losses")
      .order("rating", { ascending: false })
      .limit(20);
    setTopPlayers((data as PlayerRow[]) ?? []);
    return (data as PlayerRow[]) ?? [];
  }, []);

  const fetchRecentMatches = useCallback(async () => {
    setLoadingRecentMatches(true);
    const { data } = await supabase
      .from("matches")
      .select("*")
      .not("winner_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    const arr = (data as MatchRow[]) ?? [];
    setRecentMatches(arr);
    setLoadingRecentMatches(false);
    return arr;
  }, []);

  const fetchActiveMatches = useCallback(async (tournamentId: string) => {
    setLoadingActiveTournament(true);
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_order");
    const arr = (data as MatchRow[]) ?? [];
    setActiveMatches(arr);
    setLoadingActiveTournament(false);
    return arr;
  }, []);

  const fetchMatchOfDay = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .not("player1_score", "is", null)
      .not("player2_score", "is", null);

    if (error || !data || data.length === 0) {
      setMatchOfDay(null);
      return;
    }

    const closest = (data as MatchRow[]).reduce((best, m) => {
      const diff = Math.abs((m.player1_score ?? 0) - (m.player2_score ?? 0));
      const bestDiff = Math.abs((best.player1_score ?? 0) - (best.player2_score ?? 0));
      return diff < bestDiff ? m : best;
    });
    setMatchOfDay(closest);
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    setLoadingNews(true);
    try {
      let newsData: NewsRow[] = [];
      try {
        const { data, error: nErr } = await supabase
          .from("news").select("*").eq("published", true)
          .order("created_at", { ascending: false }).limit(4);
        if (nErr) throw nErr;
        newsData = (data as NewsRow[]) ?? [];
      } catch {
        const { data } = await supabase
          .from("news").select("*")
          .order("created_at", { ascending: false }).limit(4);
        newsData = (data as NewsRow[]) ?? [];
      }

      const [
        topRes, recentRes, allMatchesRes,
        pCount, mCount, tCount,
        upRes, actRes,
      ] = await Promise.all([
        supabase.from("players").select("id, full_name, rating, avatar_url, wins, losses").order("rating", { ascending: false }).limit(20),
        supabase.from("matches").select("*").not("winner_id", "is", null).order("created_at", { ascending: false }).limit(10),
        supabase.from("matches").select("id, player1_id, player2_id, winner_id, created_at, tournament_id, player1_score, player2_score, round, match_order, set_scores, next_match_id").not("winner_id", "is", null).order("created_at", { ascending: false }).limit(1000),
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase.from("matches").select("*", { count: "exact", head: true }).not("winner_id", "is", null),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("tournaments").select("id, name, status, starts_at, format").eq("status", "pending").order("starts_at", { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
        supabase.from("tournaments").select("id, name, status, starts_at, format").eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const topData = (topRes.data as PlayerRow[]) ?? [];
      const recentData = (recentRes.data as MatchRow[]) ?? [];
      const allMatches = (allMatchesRes.data as MatchRow[]) ?? [];

      setTopPlayers(topData);
      setRecentMatches(recentData);
      setAllMatchesForStreaks(allMatches);
      setCounts({ players: pCount.count ?? 0, matches: mCount.count ?? 0, tournaments: tCount.count ?? 0 });
      setUpcoming(upRes.data as TournamentRow | null);
      setActive(actRes.data as TournamentRow | null);
      setNews(newsData);
      setLoadingNews(false);

      let activeArr: MatchRow[] = [];
      if (actRes.data?.id) {
        activeArr = await fetchActiveMatches(actRes.data.id);
      } else {
        setActiveMatches([]);
        setLoadingActiveTournament(false);
      }

      const knownIds = new Set(topData.map(p => p.id));
      await fetchMissingPlayers(knownIds, [recentData, activeArr]);
      await fetchMatchOfDay();
    } catch (err: any) {
      console.error("Error cargando homepage:", err);
      setError("No se pudieron cargar los datos. Intentá recargar la página.");
      setTopPlayers(prev => prev ?? []);
      setRecentMatches(prev => prev ?? []);
      setNews(prev => prev ?? []);
      setLoadingNews(false);
      setLoadingRecentMatches(false);
      setLoadingActiveTournament(false);
    }
  }, [fetchActiveMatches, fetchMissingPlayers, fetchMatchOfDay]);

  useEffect(() => {
    fetchAll();
    // Establecer título de la página (alternativa simple a react-helmet)
    document.title = "Tenis de mesa Siete Palmas – Club oficial | Ranking, torneos y partidos";
  }, [fetchAll]);

  useEffect(() => {
    if (!player) { setMyRank(null); return; }
    supabase.from("players").select("*", { count: "exact", head: true }).gt("rating", player.rating)
      .then(({ count }) => setMyRank((count ?? 0) + 1));
  }, [player]);

  useEffect(() => {
    const channel = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, async () => {
        const recent = await fetchRecentMatches();
        const known = new Set([...topPlayersRef.current, ...extraPlayersRef.current].map(p => p.id));
        if (active?.id) {
          const act = await fetchActiveMatches(active.id);
          await fetchMissingPlayers(known, [recent, act]);
        } else {
          await fetchMissingPlayers(known, [recent]);
        }
        await fetchMatchOfDay();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        fetchTopPlayers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id, fetchRecentMatches, fetchActiveMatches, fetchTopPlayers, fetchMissingPlayers, fetchMatchOfDay]);

  const countdown = useCountdown(upcoming?.starts_at ? new Date(upcoming.starts_at) : undefined);
  const playersCount = useCountUp(counts.players);
  const matchesCount = useCountUp(counts.matches);
  const tournamentsCount = useCountUp(counts.tournaments);

  const top3 = (topPlayers ?? []).slice(0, 3);
  const streakLeaders = useMemo(() => {
    return (topPlayers ?? [])
      .map(p => ({ ...p, streak: calcStreak(p.id, allMatchesForStreaks) }))
      .filter(p => p.streak >= 2)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);
  }, [topPlayers, allMatchesForStreaks]);

  const featuredNews = news[0];
  const otherNews = news.slice(1, 4);
  const loading = topPlayers === null;

  const activeProgress = useMemo(() => {
    if (!active || activeMatches.length === 0) return null;
    const total = activeMatches.length;
    const completed = activeMatches.filter(m => m.winner_id !== null).length;
    return { completed, total, pct: Math.round((completed / total) * 100) };
  }, [active, activeMatches]);

  const podiumDelays = ["0ms", "200ms", "100ms"];

  return (
    <Layout>
      {/* Banner de error */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/30">
          <div className="container py-2.5 text-sm flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </span>
            <button onClick={() => fetchAll()} className="font-semibold text-destructive hover:underline shrink-0">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Sticky upcoming tournament banner */}
      {upcoming && (
        <Link to="/torneos" className="block bg-primary/10 border-b border-primary/20 animate-slide-down">
          <div className="container flex items-center justify-between gap-3 h-12 text-sm">
            <span className="flex items-center gap-2 truncate">
              <Calendar className="size-4 text-primary shrink-0" />
              <span className="font-medium truncate">
                Próximo torneo · <span className="text-primary">{upcoming.name}</span>
                {upcoming.starts_at && (
                  <> · <span className="text-muted-foreground">{format(new Date(upcoming.starts_at), "EEEE d 'de' MMMM", { locale: es })}</span></>
                )}
              </span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-semibold text-primary shrink-0">
              Inscribirme <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{ backgroundImage: "radial-gradient(hsl(0 0% 100% / .15) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <PaddleIllustration className="absolute -right-10 -top-10 size-[420px] opacity-50 animate-float" aria-hidden="true" />

        <div className="container relative py-12 md:py-20 text-primary-foreground">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-xs font-heading font-semibold uppercase tracking-wider animate-fade-in">
            <span className="size-1.5 rounded-full bg-success animate-pulse" /> Temporada activa
          </span>
          <h1 className="font-heading font-bold text-4xl md:text-6xl mt-4 max-w-2xl text-balance leading-[1.05] animate-slide-up">
            Tenis de mesa <span className="text-accent">Siete Palmas</span>
          </h1>
          <p className="mt-3 max-w-xl text-primary-foreground/80 text-base md:text-lg animate-slide-up" style={{ animationDelay: "80ms" }}>
            Torneos, rankings y desafíos del club. Inscribite, jugá y subí en el ranking.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: "160ms" }}>
            {user && player ? (
              <Link to={`/jugador/${player.id}`}
                className="relative tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-accent text-accent-foreground font-semibold shadow-lift hover:bg-accent/90 active:opacity-75 transition-all overflow-hidden">
                <span className="relative z-10">Mi perfil</span>
                <ArrowUpRight className="size-4 relative z-10" />
                <span className="absolute inset-0 shimmer pointer-events-none" />
              </Link>
            ) : (
              <Link to="/auth"
                className="relative tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-accent text-accent-foreground font-semibold shadow-lift hover:bg-accent/90 active:opacity-75 transition-all overflow-hidden">
                <span className="relative z-10">{user ? "Completar perfil" : "Entrar / Registrarme"}</span>
                <LogIn className="size-4 relative z-10" />
                <span className="absolute inset-0 shimmer pointer-events-none" />
              </Link>
            )}
            <Link to="/torneos"
              className="tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground font-semibold hover:bg-primary-foreground/20 active:opacity-75 transition-colors backdrop-blur">
              <Trophy className="size-4" /> Ver torneos
            </Link>
          </div>

          {/* Counters */}
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
            {[
              { v: playersCount, l: "Jugadores", i: Users },
              { v: matchesCount, l: "Partidos", i: Swords },
              { v: tournamentsCount, l: "Torneos", i: Trophy },
            ].map(({ v, l, i: Icon }, idx) => (
              <div key={l} className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur px-4 py-3 animate-slide-up" style={{ animationDelay: `${200 + idx * 80}ms` }}>
                <Icon className="size-4 text-accent mb-1" />
                <div className="font-heading font-bold text-2xl md:text-3xl tabular-nums">{v}</div>
                <div className="text-xs text-primary-foreground/70 uppercase tracking-wider">{l}</div>
              </div>
            ))}
          </div>

          {/* Personalized + countdown + weather + active */}
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
            {player && myRank !== null && (
              <div className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-3">
                  <Avatar name={player.full_name} url={player.avatar_url} size={44} ring />
                  <div className="min-w-0">
                    <div className="text-xs text-primary-foreground/70">Hola, {player.full_name.split(" ")[0]}</div>
                    <div className="font-heading font-semibold truncate">
                      Sos #{myRank} · <span className="text-accent">{player.rating}</span>
                    </div>
                    <div className="text-[11px] text-primary-foreground/70 tabular-nums">
                      {(player.wins ?? 0)}V · {(player.losses ?? 0)}D
                    </div>
                  </div>
                </div>
              </div>
            )}
            {countdown && upcoming && (
              <div className="rounded-2xl bg-accent/15 border border-accent/30 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "380ms" }}>
                <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                  <Bell className="size-3.5 text-accent animate-badge-pulse" /> Próximo torneo
                </div>
                <div className="font-heading font-bold text-xl mt-0.5 tabular-nums">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                </div>
              </div>
            )}
            {weather && (
              <div className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "460ms" }}>
                <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                  <WeatherIcon code={weather.weathercode} isDay={weather.isDay} /> Siete Palmas
                </div>
                <div className="font-heading font-bold text-xl mt-0.5 tabular-nums">
                  {weather.temperature}°C
                </div>
                <div className="text-xs text-primary-foreground/70">{weatherLabel(weather.weathercode)}</div>
              </div>
            )}
            {active && (
              <Link
                to={`/torneo/${active.id}`}
                className="rounded-2xl bg-success/15 border border-success/30 backdrop-blur px-4 py-3 animate-fade-in hover:bg-success/25 transition"
                style={{ animationDelay: "540ms" }}
              >
                <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                  <Activity className="size-3.5 text-success animate-pulse" /> En curso
                </div>
                <div className="font-heading font-bold text-base mt-0.5 truncate">{active.name}</div>
                <div className="text-[11px] text-primary-foreground/70 tabular-nums">
                  {activeMatches.filter(m => m.winner_id).length} de {activeMatches.length} jugados
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* PODIUM */}
      <section className="container -mt-8 md:-mt-12 relative z-10">
        <div className="glass-card p-5 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-xl md:text-2xl flex items-center gap-2">
              <Crown className="text-warning" /> Top 3 ranking
            </h2>
            <Link to="/rankings" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
              Ver todos <ChevronRight className="size-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-3 md:gap-5 items-end">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : top3.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Todavía no hay jugadores"
              hint="Cuando se registren los primeros jugadores aparecerán acá."
              ctaText="Registrarme" ctaTo="/auth"
            />
          ) : top3.length < 3 ? (
            <EmptyState
              icon={Crown}
              title={`${top3.length} jugador${top3.length === 1 ? "" : "es"} registrado${top3.length === 1 ? "" : "s"}`}
              hint="El podio aparece cuando hay 3 o más jugadores."
              ctaText="Ver ranking" ctaTo="/rankings"
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 md:gap-5 items-end">
              {[top3[1], top3[0], top3[2]].map((p, displayIdx) => (
                <PodiumCard
                  key={p.id}
                  player={p}
                  displayIdx={displayIdx}
                  matchesForSpark={allMatchesForStreaks}
                  delay={podiumDelays[displayIdx]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ACTIVITY TICKER */}
      {recentMatches && recentMatches.length > 0 && (
        <section className="mt-10 overflow-hidden border-y border-border/60 bg-card/50">
          <div className="flex items-center gap-3 py-3 group">
            <div className="shrink-0 pl-4 inline-flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-wider text-accent">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" /> En vivo
            </div>
            <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="flex gap-8 animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap">
                {[...recentMatches, ...recentMatches].map((m, i) => {
                  const w = m.winner_id ? playersById[m.winner_id] : null;
                  const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
                  const l = loserId ? playersById[loserId] : null;
                  return (
                    <span key={i} className="text-sm inline-flex items-center gap-2">
                      <Trophy className="size-3.5 text-warning animate-bounce-subtle" />
                      <span className="font-semibold">{w?.full_name ?? "—"}</span>
                      <span className="text-muted-foreground">venció a</span>
                      <span>{l?.full_name ?? "—"}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted tabular-nums">{m.player1_score}-{m.player2_score}</span>
                      <span className="text-[11px] text-muted-foreground">
                        · {formatDistanceToNow(new Date(m.created_at), { locale: es, addSuffix: true })}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MATCH OF THE DAY */}
      {matchOfDay && (() => {
        const p1 = matchOfDay.player1_id ? playersById[matchOfDay.player1_id] : null;
        const p2 = matchOfDay.player2_id ? playersById[matchOfDay.player2_id] : null;
        return (
          <section className="container pt-10">
            <div className="relative glass-card overflow-hidden p-5 md:p-7 border-accent/40 animate-fade-in">
              <div className="absolute -top-10 -right-10 size-40 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-heading font-bold uppercase tracking-wider shadow-soft">
                  <Zap className="size-3.5" /> Partido del día
                </span>
                <span className="text-xs text-muted-foreground">El más reñido de hoy</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <PlayerSide player={p1} winner={matchOfDay.winner_id === p1?.id} />
                <div className="font-heading font-bold text-3xl md:text-4xl tabular-nums">
                  {matchOfDay.player1_score} <span className="text-muted-foreground">–</span> {matchOfDay.player2_score}
                </div>
                <PlayerSide player={p2} winner={matchOfDay.winner_id === p2?.id} reverse />
              </div>
            </div>
          </section>
        );
      })()}

      {/* RECENT MATCHES + STREAKS */}
      <section className="container py-12 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Swords className="text-primary" /> Partidos recientes
          </h2>
          {loadingRecentMatches ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          ) : !recentMatches || recentMatches.length === 0 ? (
            <EmptyState icon={Swords} title="Sin partidos cargados" hint="Los partidos aparecerán acá apenas se registre el primer resultado." />
          ) : (
            <div className="space-y-3">
              {recentMatches.slice(0, 5).map((m, i) => {
                const p1 = m.player1_id ? playersById[m.player1_id] : null;
                const p2 = m.player2_id ? playersById[m.player2_id] : null;
                return (
                  <div key={m.id} className="glass-card glass-card-hover p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="text-xs text-muted-foreground md:w-32 shrink-0">
                        {m.round ?? "Partido"} · {formatDistanceToNow(new Date(m.created_at), { locale: es, addSuffix: true })}
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <PlayerSide player={p1} winner={m.winner_id === p1?.id} />
                        <div className="font-heading font-bold text-lg md:text-xl tabular-nums bg-muted/60 md:bg-transparent px-3 py-1 md:p-0 rounded-full">
                          {m.player1_score} <span className="text-muted-foreground">–</span> {m.player2_score}
                        </div>
                        <PlayerSide player={p2} winner={m.winner_id === p2?.id} reverse />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Flame className="text-accent" /> En racha
          </h2>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
          ) : streakLeaders.length === 0 ? (
            <EmptyState compact icon={Flame} title="Sin rachas activas" hint="Cuando alguien gane 2 o más seguidos aparecerá acá." />
          ) : (
            <div className="space-y-2">
              {streakLeaders.map((p, i) => (
                <Link to={`/jugador/${p.id}`} key={p.id} className="glass-card glass-card-hover p-3 flex items-center gap-3">
                  <span className="font-heading font-bold text-muted-foreground w-6 tabular-nums">#{i + 1}</span>
                  <Avatar name={p.full_name} url={p.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{p.rating}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold animate-badge-pulse">
                    <Flame className="size-3" />{p.streak}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MINI BRACKET */}
      {active && activeMatches.length > 0 && (
        <section className="container pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Trophy className="text-warning" /> Torneo activo · {active.name}
            </h2>
            <Link to={`/torneo/${active.id}`} className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
              Ver completo <ChevronRight className="size-4" />
            </Link>
          </div>

          {activeProgress && (
            <div className="glass-card p-4 mb-4 flex items-center gap-4">
              <div className="text-sm font-medium shrink-0 hidden sm:block">
                {activeProgress.completed} de {activeProgress.total} partidos
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${activeProgress.pct}%` }}
                />
              </div>
              <div className="font-heading font-bold tabular-nums text-primary shrink-0">
                {activeProgress.pct}%
              </div>
            </div>
          )}

          <div className="glass-card p-6 pt-10 overflow-x-auto">
            <BracketWithLines matches={activeMatches as any} playersById={playersById as any} />
          </div>
        </section>
      )}

      {/* NEWS con placeholders de imagen */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-2xl">Noticias del club</h2>
          <Link to="/noticias" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            Todas <ChevronRight className="size-4" />
          </Link>
        </div>
        {loadingNews ? (
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="md:col-span-2 md:row-span-2 h-72 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : news.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sin noticias todavía" hint="El equipo del club publicará novedades acá." />
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {featuredNews && (
              <Link to={`/noticia/${featuredNews.id}`} className="md:col-span-2 md:row-span-2 glass-card glass-card-hover overflow-hidden group animate-fade-in">
                <div className="aspect-[16/9] md:aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
                  {featuredNews.image_url ? (
                    <img src={featuredNews.image_url} alt={featuredNews.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <ImageIcon className="size-12 text-muted-foreground/50" />
                  )}
                </div>
                <div className="p-5">
                  <NewsCategoryBadge title={featuredNews.title} className="mb-2" />
                  <h3 className="font-heading font-bold text-xl md:text-2xl text-balance">{featuredNews.title}</h3>
                  <p className="text-muted-foreground mt-2 line-clamp-3">{featuredNews.content}</p>
                  <div className="text-xs text-muted-foreground mt-3">
                    {format(new Date(featuredNews.created_at), "d MMM yyyy", { locale: es })}
                  </div>
                </div>
              </Link>
            )}
            {otherNews.map((n, i) => (
              <Link key={n.id} to={`/noticia/${n.id}`} className="glass-card glass-card-hover overflow-hidden group animate-fade-in" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
                <div className="aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
                  {n.image_url ? (
                    <img src={n.image_url} alt={n.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <ImageIcon className="size-10 text-muted-foreground/50" />
                  )}
                </div>
                <div className="p-4">
                  <NewsCategoryBadge title={n.title} className="mb-2" />
                  <h3 className="font-heading font-semibold text-base text-balance">{n.title}</h3>
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(n.created_at), "d MMM", { locale: es })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN: CÓMO LLEGAR + REDES SOCIALES */}
      <section className="container pb-20">
        <div className="glass-card p-5 md:p-7 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-heading font-bold text-2xl flex items-center gap-2 mb-4">
              <MapPin className="text-primary" /> Cómo llegar
            </h2>
            <p className="text-muted-foreground mb-2">📍 Club Siete Palmas</p>
            <p className="font-medium">Calle Falsa 123, Las Palmas de Gran Canaria</p>
            <p className="text-sm text-muted-foreground mt-4">Horario: Lunes a viernes de 17 a 22 h</p>
            <div className="mt-4 flex gap-4">
              <a href="https://instagram.com/tuclub" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="size-6" />
              </a>
              <a href="https://wa.me/34612345678" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm0 18.29c-1.49 0-2.95-.4-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.84-1.29-1.28-2.77-1.28-4.29 0-4.46 3.63-8.09 8.09-8.09s8.09 3.63 8.09 8.09-3.63 8.09-8.09 8.09zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.38-.4-.52-.41-.14-.01-.29-.01-.44-.01-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.09 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.51.09.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/>
                </svg>
              </a>
              <a href="mailto:club@ejemplo.com" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="size-6" />
              </a>
            </div>
          </div>
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3197.123456789!2d-15.5!3d28.1!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjnCsDA2JzAwLjAiTiAxNcKwMzAnMDAuMCJX!5e0!3m2!1ses!2ses!4v1234567890"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
              title="Mapa del club"
            ></iframe>
          </div>
        </div>
      </section>

      {/* FEATURE CTA cards */}
      <section className="container pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: "/rankings", icon: BarChart3, title: "Ranking completo", desc: "Todos los jugadores ordenados por rating con stats." },
          { to: "/torneos", icon: Trophy, title: "Torneos", desc: "Próximos, en curso y finalizados." },
          { to: "/desafios", icon: Swords, title: "Desafíos", desc: "Desafiá a otro jugador y subí en la tabla." },
        ].map(({ to, icon: Icon, title, desc }, i) => (
          <Link key={to} to={to} className="group glass-card glass-card-hover p-5 flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="grid place-items-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </section>
    </Layout>
  );
};

function EmptyState({
  icon: Icon, title, hint, ctaText, ctaTo, compact,
}: {
  icon: any; title: string; hint?: string;
  ctaText?: string; ctaTo?: string; compact?: boolean;
}) {
  return (
    <div className={cn("glass-card text-center", compact ? "p-5" : "p-8")}>
      <Icon className="mx-auto size-8 text-muted-foreground/60" />
      <div className="font-heading font-semibold mt-3">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
      {ctaText && ctaTo && (
        <Link to={ctaTo} className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline">
          {ctaText} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export default Index;
