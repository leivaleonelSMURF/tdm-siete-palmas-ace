import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Trophy, Users, Calendar, MapPin, Award } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { BracketWithLines, BracketMatch } from "@/components/BracketWithLines";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type T = {
  id: string; name: string; format: string; status: string;
  starts_at: string | null; max_players: number | null;
  description: string | null; location: string | null; prize: string | null;
};
type Reg = { id: string; player_id: string };
type PlayerLite = { id: string; full_name: string; avatar_url: string | null; rating: number };

const STATUS: Record<string, { label: string; cls: string }> = {
  in_progress: { label: "En curso", cls: "bg-success/15 text-success" },
  pending: { label: "Próximo", cls: "bg-primary/12 text-primary" },
  finished: { label: "Finalizado", cls: "bg-muted text-muted-foreground" },
};

const TournamentDetail = () => {
  const { id = "" } = useParams();
  const { player } = useAuth();
  const [t, setT] = useState<T | null>(null);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [playersById, setPlayersById] = useState<Record<string, PlayerLite>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [{ data: tour }, { data: ms }, { data: rs }] = await Promise.all([
      supabase.from("tournaments").select("id, name, format, status, starts_at, max_players, description, location, prize").eq("id", id).maybeSingle(),
      supabase.from("matches").select("id, tournament_id, player1_id, player2_id, player1_score, player2_score, winner_id, round, match_order").eq("tournament_id", id).order("match_order", { ascending: true }),
      supabase.from("tournament_registrations").select("id, player_id").eq("tournament_id", id),
    ]);
    setT((tour as T) ?? null);
    setMatches((ms as BracketMatch[]) ?? []);
    setRegs((rs as Reg[]) ?? []);

    const ids = new Set<string>();
    (ms ?? []).forEach((m: any) => { if (m.player1_id) ids.add(m.player1_id); if (m.player2_id) ids.add(m.player2_id); });
    (rs ?? []).forEach((r: any) => ids.add(r.player_id));
    if (ids.size > 0) {
      const { data: ps } = await supabase.from("players").select("id, full_name, avatar_url, rating").in("id", [...ids]);
      const map: Record<string, PlayerLite> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setPlayersById(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations", filter: `tournament_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isRegistered = !!player && regs.some(r => r.player_id === player.id);
  const isFull = !!t?.max_players && regs.length >= t.max_players;

  const handleRegister = async () => {
    if (!player) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para inscribirte.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    if (isRegistered) {
      const reg = regs.find(r => r.player_id === player.id);
      if (reg) {
        const { error } = await supabase.from("tournament_registrations").delete().eq("id", reg.id);
        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
        else toast({ title: "Inscripción cancelada" });
      }
    } else {
      const { error } = await supabase.from("tournament_registrations").insert({ tournament_id: id, player_id: player.id });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "¡Inscripto!", description: "Te anotamos en el torneo." });
    }
    setSubmitting(false);
  };

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

  if (!t) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Torneo no encontrado.</p>
          <Link to="/torneos" className="text-primary font-medium mt-3 inline-block">Ver torneos</Link>
        </div>
      </Layout>
    );
  }

  const status = STATUS[t.status] ?? STATUS.pending;
  const registeredPlayers = regs.map(r => playersById[r.player_id]).filter(Boolean) as PlayerLite[];

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <Link to="/torneos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Torneos
        </Link>

        <div className="glass-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <span className={cn("inline-flex items-center text-xs font-heading font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", status.cls)}>
                {status.label}
              </span>
              <h1 className="font-heading font-bold text-3xl md:text-4xl mt-2 flex items-center gap-2">
                <Trophy className="text-warning" /> {t.name}
              </h1>
              {t.description && <p className="text-muted-foreground mt-2 max-w-2xl">{t.description}</p>}
            </div>
            {t.status !== "finished" && (
              <button
                onClick={handleRegister}
                disabled={submitting || (!isRegistered && isFull)}
                className={cn(
                  "tap-target inline-flex items-center gap-2 px-5 rounded-xl font-semibold shadow-soft transition-all active:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed",
                  isRegistered
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isRegistered ? "Cancelar inscripción" : isFull ? "Cupos agotados" : "Inscribirme"}
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {t.starts_at && (
              <Info icon={Calendar} label="Fecha" value={format(new Date(t.starts_at), "d MMM yyyy", { locale: es })} />
            )}
            {t.location && <Info icon={MapPin} label="Lugar" value={t.location} />}
            <Info icon={Users} label="Inscriptos" value={`${regs.length}${t.max_players ? ` / ${t.max_players}` : ""}`} />
            {t.prize && <Info icon={Award} label="Premio" value={t.prize} />}
          </div>
        </div>

        {matches.length > 0 && (
          <div className="mt-8">
            <h2 className="font-heading font-bold text-2xl mb-6 flex items-center gap-2">
              <Trophy className="text-primary" /> Bracket
            </h2>
            <div className="glass-card p-6 pt-10">
              <BracketWithLines matches={matches} playersById={playersById} />
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
            <Users className="text-primary" /> Inscriptos ({regs.length})
          </h2>
          {registeredPlayers.length === 0 ? (
            <div className="glass-card p-6 text-center text-muted-foreground">Aún no hay jugadores inscriptos.</div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {registeredPlayers.map((p, i) => (
                <li key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link to={`/jugador/${p.id}`} className="glass-card glass-card-hover p-3 flex items-center gap-3">
                    <Avatar name={p.full_name} url={p.avatar_url} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">Rating {p.rating}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
};

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </div>
      <div className="font-heading font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

export default TournamentDetail;
