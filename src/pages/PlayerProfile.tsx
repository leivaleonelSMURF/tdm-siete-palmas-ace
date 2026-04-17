import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Trophy, Swords, Flame, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Sparkline } from "@/components/Sparkline";
import { playerById, matches, playersById, playerRank } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const PlayerProfile = () => {
  const { id = "" } = useParams();
  const p = playerById(id);

  if (!p) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Jugador no encontrado.</p>
          <Link to="/rankings" className="text-primary font-medium mt-3 inline-block">Ver ranking</Link>
        </div>
      </Layout>
    );
  }

  const rank = playerRank(p.id);
  const myMatches = matches
    .filter(m => m.winner_id && (m.player1_id === p.id || m.player2_id === p.id))
    .slice(-10).reverse();
  const total = p.wins + p.losses;
  const winPct = total ? Math.round((p.wins / total) * 100) : 0;
  const trendUp = p.history.at(-1)! >= p.history[0];
  const ratingDelta = p.history.at(-1)! - p.history[0];

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <Link to="/rankings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Ranking
        </Link>

        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={p.full_name} size={96} ring />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-bold text-3xl md:text-4xl">{p.full_name}</h1>
              {rank <= 3 && <Crown className={cn("size-6", rank === 1 ? "text-warning" : rank === 2 ? "text-muted-foreground" : "text-bronze")} />}
              {p.streak >= 3 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 text-accent font-bold text-sm animate-badge-pulse">
                  <Flame className="size-3.5" /> {p.streak} en racha
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-1">Posición #{rank} · Rating {p.rating}</div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
              <Stat label="Rating" value={p.rating} />
              <Stat label="Ganados" value={p.wins} tone="success" />
              <Stat label="Perdidos" value={p.losses} tone="destructive" />
              <Stat label="% Vict." value={`${winPct}%`} />
            </div>
          </div>
          <button className="tap-target inline-flex items-center gap-2 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 active:opacity-75 transition-all">
            <Swords className="size-4" /> Desafiar
          </button>
        </div>

        {/* Rating chart */}
        <div className="mt-6 glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg">Evolución de rating</h2>
            <span className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
              trendUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            )}>
              {trendUp ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {ratingDelta > 0 ? "+" : ""}{ratingDelta}
            </span>
          </div>
          <Sparkline values={p.history} width={800} height={120} strokeWidth={2.5} className="w-full" />
        </div>

        {/* Match history */}
        <div className="mt-6">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Swords className="text-primary" /> Últimos partidos
          </h2>
          {myMatches.length === 0 ? (
            <div className="glass-card p-6 text-center text-muted-foreground">Sin partidos jugados aún.</div>
          ) : (
            <ul className="space-y-3">
              {myMatches.map((m, i) => {
                const isP1 = m.player1_id === p.id;
                const opp = playersById[isP1 ? m.player2_id : m.player1_id]!;
                const my = isP1 ? m.player1_score : m.player2_score;
                const their = isP1 ? m.player2_score : m.player1_score;
                const won = m.winner_id === p.id;
                return (
                  <li key={m.id} className="glass-card p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <span className={cn(
                      "size-9 grid place-items-center rounded-xl font-heading font-bold text-sm",
                      won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      {won ? "G" : "P"}
                    </span>
                    <Avatar name={opp.full_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <Link to={`/jugador/${opp.id}`} className="font-medium hover:text-primary transition-colors truncate block">
                        vs {opp.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {m.round} · {format(new Date(m.created_at), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    <span className="font-heading font-bold text-lg tabular-nums">
                      {my}<span className="text-muted-foreground">–</span>{their}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
};

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "destructive" }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn(
        "font-heading font-bold text-xl tabular-nums",
        tone === "success" && "text-success",
        tone === "destructive" && "text-destructive",
      )}>{value}</div>
    </div>
  );
}

export default PlayerProfile;
