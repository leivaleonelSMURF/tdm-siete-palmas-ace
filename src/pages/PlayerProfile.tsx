import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Trophy, Swords, Crown } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type P = {
  id: string; full_name: string; rating: number; avatar_url: string | null;
  wins: number; losses: number; bio: string | null;
};
type M = {
  id: string; created_at: string; round: string | null;
  player1_id: string | null; player2_id: string | null;
  player1_score: number | null; player2_score: number | null; winner_id: string | null;
};

const PlayerProfile = () => {
  const { id = "" } = useParams();
  const [p, setP] = useState<P | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [matches, setMatches] = useState<M[]>([]);
  const [opponents, setOpponents] = useState<Record<string, { id: string; full_name: string; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [{ data: player }, { data: all }, { data: ms }] = await Promise.all([
        supabase.from("players").select("id, full_name, rating, avatar_url, wins, losses, bio").eq("id", id).maybeSingle(),
        supabase.from("players").select("id, rating").order("rating", { ascending: false }),
        supabase.from("matches").select("id, created_at, round, player1_id, player2_id, player1_score, player2_score, winner_id")
          .or(`player1_id.eq.${id},player2_id.eq.${id}`)
          .not("winner_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (!mounted) return;
      setP((player as P) ?? null);
      const idx = (all ?? []).findIndex((x: any) => x.id === id);
      setRank(idx >= 0 ? idx + 1 : 0);
      setMatches((ms as M[]) ?? []);

      const oppIds = new Set<string>();
      (ms as M[] ?? []).forEach(m => {
        if (m.player1_id && m.player1_id !== id) oppIds.add(m.player1_id);
        if (m.player2_id && m.player2_id !== id) oppIds.add(m.player2_id);
      });
      if (oppIds.size > 0) {
        const { data: opps } = await supabase
          .from("players")
          .select("id, full_name, avatar_url")
          .in("id", [...oppIds]);
        if (!mounted) return;
        const map: typeof opponents = {};
        (opps ?? []).forEach((o: any) => { map[o.id] = o; });
        setOpponents(map);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-8 md:py-12 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

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

  const total = p.wins + p.losses;
  const winPct = total ? Math.round((p.wins / total) * 100) : 0;

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <Link to="/rankings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Ranking
        </Link>

        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={p.full_name} url={p.avatar_url} size={96} ring />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-bold text-3xl md:text-4xl">{p.full_name}</h1>
              {rank > 0 && rank <= 3 && <Crown className={cn("size-6", rank === 1 ? "text-warning" : rank === 2 ? "text-muted-foreground" : "text-bronze")} />}
            </div>
            <div className="text-muted-foreground mt-1">
              {rank > 0 ? `Posición #${rank} · ` : ""}Rating {p.rating}
            </div>
            {p.bio && <p className="text-sm text-foreground/80 mt-2">{p.bio}</p>}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
              <Stat label="Rating" value={p.rating} />
              <Stat label="Ganados" value={p.wins} tone="success" />
              <Stat label="Perdidos" value={p.losses} tone="destructive" />
              <Stat label="% Vict." value={`${winPct}%`} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Swords className="text-primary" /> Últimos partidos
          </h2>
          {matches.length === 0 ? (
            <div className="glass-card p-6 text-center text-muted-foreground">Sin partidos jugados aún.</div>
          ) : (
            <ul className="space-y-3">
              {matches.map((m, i) => {
                const isP1 = m.player1_id === p.id;
                const oppId = isP1 ? m.player2_id : m.player1_id;
                const opp = oppId ? opponents[oppId] : null;
                const my = isP1 ? m.player1_score ?? 0 : m.player2_score ?? 0;
                const their = isP1 ? m.player2_score ?? 0 : m.player1_score ?? 0;
                const won = m.winner_id === p.id;
                return (
                  <li key={m.id} className="glass-card p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <span className={cn(
                      "size-9 grid place-items-center rounded-xl font-heading font-bold text-sm",
                      won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      {won ? "G" : "P"}
                    </span>
                    {opp && <Avatar name={opp.full_name} url={opp.avatar_url} size={36} />}
                    <div className="flex-1 min-w-0">
                      {opp ? (
                        <Link to={`/jugador/${opp.id}`} className="font-medium hover:text-primary transition-colors truncate block">
                          vs {opp.full_name}
                        </Link>
                      ) : (
                        <div className="font-medium truncate text-muted-foreground">vs A definir</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {m.round ?? "Partido"} · {format(new Date(m.created_at), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    <span className="font-heading font-bold text-lg tabular-nums">
                      {my}<span className="text-muted-foreground">–</span>{their}
                    </span>
                    {won && <Trophy className="size-4 text-warning" />}
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
