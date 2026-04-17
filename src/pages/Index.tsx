import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight, Crown, Flame, Trophy, Calendar, ArrowRight,
  TrendingUp, TrendingDown, Swords, BarChart3, Users, ArrowUpRight, Bell,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Sparkline } from "@/components/Sparkline";
import { PaddleIllustration } from "@/components/PaddleIllustration";
import { BracketWithLines } from "@/components/BracketWithLines";
import { NewsCategoryBadge } from "@/components/NewsCategoryBadge";
import { useCountUp } from "@/hooks/useCountUp";
import { useCountdown } from "@/hooks/useCountdown";
import {
  rankedPlayers, recentMatches, news, tournaments, players,
  matchesByTournament, playersById, playerRank,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";

const Index = () => {
  const ranking = rankedPlayers();
  const top3 = ranking.slice(0, 3);
  const me = playersById["p1"]; // mock "logged-in" player
  const myRank = playerRank("p1");

  const upcoming = tournaments.find(t => t.status === "pending");
  const active = tournaments.find(t => t.status === "in_progress");
  const activeMatches = active ? matchesByTournament(active.id) : [];

  const countdown = useCountdown(upcoming?.starts_at);

  const playersCount = useCountUp(players.length);
  const matchesCount = useCountUp(48);
  const tournamentsCount = useCountUp(tournaments.length);

  const featuredNews = news[0];
  const otherNews = news.slice(1, 4);

  return (
    <Layout>
      {/* Sticky upcoming tournament banner */}
      {upcoming && (
        <Link
          to="/torneos"
          className="block bg-primary/10 border-b border-primary/20 animate-slide-down"
        >
          <div className="container flex items-center justify-between gap-3 h-12 text-sm">
            <span className="flex items-center gap-2 truncate">
              <Calendar className="size-4 text-primary shrink-0" />
              <span className="font-medium truncate">
                Próximo torneo · <span className="text-primary">{upcoming.name}</span> ·{" "}
                <span className="text-muted-foreground">
                  {format(new Date(upcoming.starts_at), "EEEE d 'de' MMMM", { locale: es })}
                </span>
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
            <Link
              to={me ? `/jugador/${me.id}` : "/registro"}
              className="relative tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-accent text-accent-foreground font-semibold shadow-lift hover:bg-accent/90 active:opacity-75 transition-all overflow-hidden"
            >
              <span className="relative z-10">{me ? "Mi perfil" : "Registrarme"}</span>
              <ArrowUpRight className="size-4 relative z-10" />
              <span className="absolute inset-0 shimmer pointer-events-none" />
            </Link>
            <Link
              to="/torneos"
              className="tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground font-semibold hover:bg-primary-foreground/20 active:opacity-75 transition-colors backdrop-blur"
            >
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

          {/* Personalized card + countdown */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl">
            {me && (
              <div className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-3">
                  <Avatar name={me.full_name} size={44} ring />
                  <div className="min-w-0">
                    <div className="text-xs text-primary-foreground/70">Hola, {me.full_name.split(" ")[0]}</div>
                    <div className="font-heading font-semibold truncate">
                      Sos #{myRank} en el ranking · <span className="text-accent">{me.rating}</span>
                    </div>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-semibold">
                    <TrendingUp className="size-3" />+{me.history.at(-1)! - me.history[0]}
                  </span>
                </div>
              </div>
            )}
            {countdown && (
              <div className="rounded-2xl bg-accent/15 border border-accent/30 backdrop-blur px-4 py-3 animate-fade-in" style={{ animationDelay: "380ms" }}>
                <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                  <Bell className="size-3.5 text-accent animate-badge-pulse" /> Próximo torneo
                </div>
                <div className="font-heading font-bold text-xl mt-0.5 tabular-nums">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m
                </div>
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

          <div className="grid grid-cols-3 gap-3 md:gap-5 items-end">
            {[top3[1], top3[0], top3[2]].map((p, displayIdx) => {
              const realRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
              const platforms = ["bg-silver", "bg-gold", "bg-bronze"];
              const platformH = ["h-16", "h-24", "h-10"];
              const topPad = ["pt-8", "pt-2", "pt-14"];
              return (
                <div key={p.id} className={cn("flex flex-col items-center", topPad[displayIdx])}>
                  <Link to={`/jugador/${p.id}`} className="w-full glass-card glass-card-hover p-3 md:p-4 text-center">
                    <div className="relative inline-block">
                      <Avatar name={p.full_name} size={56} ring />
                      {realRank === 1 && (
                        <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 size-5 text-warning fill-warning drop-shadow" />
                      )}
                    </div>
                    <div className="mt-2 font-heading font-semibold text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{p.rating}</div>
                    <Sparkline values={p.history} width={60} height={16} className="mx-auto mt-1" />
                  </Link>
                  <div className={cn("w-full rounded-t-lg mt-2 grid place-items-center text-primary-foreground font-heading font-bold", platformH[displayIdx], platforms[displayIdx])}>
                    {realRank}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ACTIVITY TICKER */}
      <section className="mt-10 overflow-hidden border-y border-border/60 bg-card/50">
        <div className="flex items-center gap-3 py-3">
          <div className="shrink-0 pl-4 inline-flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-wider text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" /> En vivo
          </div>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex gap-8 animate-marquee hover:[animation-play-state:paused] whitespace-nowrap">
              {[...recentMatches, ...recentMatches].map((m, i) => {
                const w = playersById[m.winner_id];
                const l = m.winner_id === m.player1_id ? playersById[m.player2_id] : playersById[m.player1_id];
                return (
                  <span key={i} className="text-sm inline-flex items-center gap-2">
                    <Trophy className="size-3.5 text-warning animate-bounce-subtle" />
                    <span className="font-semibold">{w?.full_name}</span>
                    <span className="text-muted-foreground">venció a</span>
                    <span>{l?.full_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted tabular-nums">{m.player1_score}-{m.player2_score}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* RECENT MATCHES + NEWS */}
      <section className="container py-12 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Swords className="text-primary" /> Partidos recientes
          </h2>
          <div className="space-y-3">
            {recentMatches.map((m, i) => {
              const p1 = playersById[m.player1_id]!;
              const p2 = playersById[m.player2_id]!;
              const w = m.winner_id;
              return (
                <div key={m.id} className="glass-card glass-card-hover p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="text-xs text-muted-foreground md:w-32 shrink-0">
                      {m.round} ·{" "}
                      {formatDistanceToNow(new Date(m.created_at), { locale: es, addSuffix: true })}
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <PlayerSide player={p1} winner={w === p1.id} />
                      <div className="font-heading font-bold text-lg md:text-xl tabular-nums bg-muted/60 md:bg-transparent px-3 py-1 md:p-0 rounded-full">
                        {m.player1_score} <span className="text-muted-foreground">–</span> {m.player2_score}
                      </div>
                      <PlayerSide player={p2} winner={w === p2.id} reverse />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Flame className="text-accent" /> En racha
          </h2>
          <div className="space-y-2">
            {ranking.filter(p => p.streak >= 3).slice(0, 5).map((p, i) => {
              const rank = i + 1;
              const trendUp = p.history.at(-1)! >= p.history[0];
              return (
                <Link to={`/jugador/${p.id}`} key={p.id} className="glass-card glass-card-hover p-3 flex items-center gap-3">
                  <span className="font-heading font-bold text-muted-foreground w-6 tabular-nums">#{rank}</span>
                  <Avatar name={p.full_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{p.rating}</div>
                  </div>
                  <span className="hidden sm:block">
                    <Sparkline values={p.history} />
                  </span>
                  <span className="sm:hidden inline-flex items-center text-xs">
                    {trendUp
                      ? <TrendingUp className="size-3.5 text-success" />
                      : <TrendingDown className="size-3.5 text-destructive" />}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold animate-badge-pulse">
                    <Flame className="size-3" />{p.streak}
                  </span>
                </Link>
              );
            })}
          </div>
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
          <div className="glass-card p-6 pt-10">
            <BracketWithLines matches={activeMatches} />
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
        <div className="grid md:grid-cols-3 gap-4">
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
              <p className="text-muted-foreground mt-2">{featuredNews.excerpt}</p>
              <div className="text-xs text-muted-foreground mt-3">
                {format(new Date(featuredNews.created_at), "d MMM yyyy", { locale: es })}
              </div>
            </div>
          </Link>
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

function PlayerSide({ player, winner, reverse }: { player: { id: string; full_name: string }; winner: boolean; reverse?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", reverse && "flex-row-reverse text-right")}>
      <Avatar name={player.full_name} size={36} />
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

export default Index;
