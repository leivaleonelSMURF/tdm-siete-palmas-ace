import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight, Crown, Flame, Trophy, Calendar, ArrowRight,
  TrendingUp, Swords, BarChart3, Users, ArrowUpRight, Bell,
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, Zap, LogIn,
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

function PodiumCard({ player, displayIdx }: { player: PlayerRow; displayIdx: number }) {
  const realRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
  const platforms = ["bg-silver", "bg-gold", "bg-bronze"];
  const platformH = ["h-16", "h-24", "h-10"];
  const topPad = ["pt-8", "pt-2", "pt-14"];
  return (
    <div className={cn("flex flex-col items-center", topPad[displayIdx])}>
      <Link to={`/jugador/${player.id}`} className="w-full glass-card glass-card-hover p-3 md:p-4 text-center">
        <div className="relative inline-block">
          <Avatar name={player.full_name} url={player.avatar_url} size={56} ring />
          {realRank === 1 && (
            <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 size-5 text-warning fill-warning drop-shadow" />
          )}
        </div>
        <div className="mt-2 font-heading font-semibold text-sm truncate">{player.full_name}</div>
        <div className="text-xs text-muted-foreground tabular-nums">{player.rating}</div>
      </Link>
      <div className={cn("w-full rounded-t-lg mt-2 grid place-items-center text-primary-foreground font-heading font-bold", platformH[displayIdx], platforms[displayIdx])}>
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
  const [recentMatches, setRecentMatches] = useState<MatchRow[] | null>(null);
  const [allMatchesForStreaks, setAllMatchesForStreaks] = useState<MatchRow[]>([]);
  const [counts, setCounts] = useState({ players: 0, matches: 0, tournaments: 0 });
  const [upcoming, setUpcoming] = useState<TournamentRow | null>(null);
  const [active, setActive] = useState<TournamentRow | null>(null);
  const [activeMatches, setActiveMatches] = useState<MatchRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const playersById = useMemo(() => {
    const map: Record<string, PlayerRow> = {};
    (topPlayers ?? []).forEach(p => { map[p.id] = p; });
    return map;
  }, [topPlayers]);

  const fetchAll = async () => {
    const [
      topRes, recentRes, allMatchesRes,
      pCount, mCount, tCount,
      upRes, actRes, newsRes,
    ] = await Promise.all([
      supabase.from("players").select("id, full_name, rating, avatar_url, wins, losses").order("rating", { ascending: false }).limit(20),
      supabase.from("matches").select("*").not("winner_id", "is", null).order("created_at", { ascending: false }).limit(10),
      supabase.from("matches").select("id, player1_id, player2_id, winner_id, created_at, tournament_id, player1_score, player2_score, round, match_order, set_scores, next_match_id").not("winner_id", "is", null).order("created_at", { ascending: false }).limit(200),
      supabase.from("players").select("*", { count: "exact", head: true }),
      supabase.from("matches").select("*", { count: "exact", head: true }).not("winner_id", "is", null),
      supabase.from("tournaments").select("*", { count: "exact", head: true }),
      supabase.from("tournaments").select("id, name, status, starts_at, format").eq("status", "pending").order("starts_at", { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
      supabase.from("tournaments").select("id, name, status, starts_at, format").eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("news").select("*").eq("published", true).order("created_at", { ascending: false }).limit(4),
    ]);

    setTopPlayers((topRes.data as PlayerRow[]) ?? []);
    setRecentMatches((recentRes.data as MatchRow[]) ?? []);
    setAllMatchesForStreaks((allMatchesRes.data as MatchRow[]) ?? []);
    setCounts({ players: pCount.count ?? 0, matches: mCount.count ?? 0, tournaments: tCount.count ?? 0 });
    setUpcoming(upRes.data as TournamentRow | null);
    setActive(actRes.data as TournamentRow | null);
    setNews((newsRes.data as NewsRow[]) ?? []);

    if (actRes.data?.id) {
      const { data: am } = await supabase.from("matches").select("*").eq("tournament_id", actRes.data.id).order("match_order");
      setActiveMatches((am as MatchRow[]) ?? []);
    } else {
      setActiveMatches([]);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // My rank
  useEffect(() => {
    if (!player) { setMyRank(null); return; }
    supabase.from("players").select("*", { count: "exact", head: true }).gt("rating", player.rating)
      .then(({ count }) => setMyRank((count ?? 0) + 1));
  }, [player]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const countdown = useCountdown(upcoming?.starts_at ?? undefined);
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

  return (
    <Layout>
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
        <PaddleIllustration className="absolute -right-10 -top-10 size-[420px] opacity-50 animate-float" />

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

          {/* Personalized + countdown + weather */}
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
            {player && myRank !== null && (
              <div className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-3">
                  <Avatar name={player.full_name} url={player.avatar_url} size={44} ring />
                  <div className="min-w-0">
                    <div className="text-xs text-primary-foreground/70">Hola, {player.full_name.split(" ")[0]}</div>
                    <div className="font-heading font-semibold truncate">
                      Sos #{myRank} · <span className="text-accent">{player.rating}</span>
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
                <PodiumCard key={p.id} player={p} displayIdx={displayIdx} />
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
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RECENT MATCHES + STREAKS */}
      <section className="container py-12 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Swords className="text-primary" /> Partidos recientes
          </h2>
          {loading ? (
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
          <div className="glass-card p-6 pt-10 overflow-x-auto">
            <BracketWithLines matches={activeMatches as any} playersById={playersById as any} />
          </div>
        </section>
      )}

      {/* NEWS */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-2xl">Noticias del club</h2>
          <Link to="/noticias" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            Todas <ChevronRight className="size-4" />
          </Link>
        </div>
        {news.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sin noticias todavía" hint="El equipo del club publicará novedades acá." />
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {featuredNews && (
              <Link to={`/noticia/${featuredNews.id}`} className="md:col-span-2 md:row-span-2 glass-card glass-card-hover overflow-hidden group animate-fade-in">
                <div className="aspect-[16/9] md:aspect-[16/10] overflow-hidden bg-muted">
                  {featuredNews.image_url && (
                    <img src={featuredNews.image_url} alt={featuredNews.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {n.image_url && (
                    <img src={n.image_url} alt={n.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
