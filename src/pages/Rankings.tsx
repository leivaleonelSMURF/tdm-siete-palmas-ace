import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Crown, Flame, TrendingUp, TrendingDown } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Sparkline } from "@/components/Sparkline";
import { rankedPlayers } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const Rankings = () => {
  const all = useMemo(() => rankedPlayers(), []);
  const [q, setQ] = useState("");
  const filtered = q
    ? all.filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()))
    : all;
  const top3 = all.slice(0, 3);

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
          <Crown className="text-warning" /> Ranking
        </h1>
        <p className="text-muted-foreground mt-1">Todos los jugadores ordenados por rating.</p>

        {/* Mini podium */}
        <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4 items-end max-w-2xl">
          {[top3[1], top3[0], top3[2]].map((p, di) => {
            const realRank = di === 0 ? 2 : di === 1 ? 1 : 3;
            const colors = ["bg-silver", "bg-gold", "bg-bronze"];
            const h = ["h-12", "h-20", "h-8"];
            return (
              <div key={p.id} className={cn("flex flex-col items-center", di === 0 ? "pt-6" : di === 2 ? "pt-10" : "pt-1")}>
                <Link to={`/jugador/${p.id}`} className="glass-card glass-card-hover p-3 text-center w-full">
                  <Avatar name={p.full_name} size={48} ring className="mx-auto" />
                  <div className="mt-2 font-heading font-semibold text-sm truncate">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{p.rating}</div>
                </Link>
                <div className={cn("w-full rounded-t-lg mt-2 grid place-items-center text-primary-foreground font-heading font-bold", h[di], colors[di])}>{realRank}°</div>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="mt-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar jugador…"
            className="w-full glass-card pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 transition tap-target"
          />
        </div>

        {/* Table */}
        <div className="mt-6 glass-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[60px_1fr_90px_80px_80px_90px_120px] gap-3 px-5 py-3 border-b border-border/60 text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Pos</span><span>Jugador</span><span className="text-right">Rating</span>
            <span className="text-right">G</span><span className="text-right">P</span>
            <span className="text-right">% Vict</span><span className="text-right">Tendencia</span>
          </div>
          <ul>
            {filtered.map((p, i) => {
              const rank = all.findIndex(x => x.id === p.id) + 1;
              const total = p.wins + p.losses;
              const winPct = total ? Math.round((p.wins / total) * 100) : 0;
              const trendUp = p.history.at(-1)! >= p.history[0];
              return (
                <li key={p.id}>
                  <Link
                    to={`/jugador/${p.id}`}
                    className={cn(
                      "grid md:grid-cols-[60px_1fr_90px_80px_80px_90px_120px] grid-cols-[40px_1fr_auto] gap-3 px-4 md:px-5 py-3 items-center hover:bg-muted/50 transition-colors active:opacity-75 tap-target animate-fade-in",
                      i % 2 && "bg-muted/20"
                    )}
                    style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                  >
                    <span className={cn(
                      "font-heading font-bold tabular-nums",
                      rank === 1 && "text-warning",
                      rank === 2 && "text-muted-foreground",
                      rank === 3 && "text-bronze",
                    )}>#{rank}</span>
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.full_name} size={36} />
                      <span className="min-w-0">
                        <span className="font-medium block truncate">{p.full_name}</span>
                        <span className="md:hidden text-xs text-muted-foreground tabular-nums">
                          {p.rating} · {winPct}%
                          {p.streak >= 3 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-accent">
                              <Flame className="size-3" />{p.streak}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                    <span className="hidden md:block text-right font-heading font-semibold tabular-nums">{p.rating}</span>
                    <span className="hidden md:block text-right text-success tabular-nums">{p.wins}</span>
                    <span className="hidden md:block text-right text-destructive tabular-nums">{p.losses}</span>
                    <span className="hidden md:block text-right tabular-nums">{winPct}%</span>
                    <span className="hidden md:flex justify-end items-center gap-2">
                      <Sparkline values={p.history} />
                      {trendUp
                        ? <TrendingUp className="size-4 text-success" />
                        : <TrendingDown className="size-4 text-destructive" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Sin resultados.</div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Rankings;
