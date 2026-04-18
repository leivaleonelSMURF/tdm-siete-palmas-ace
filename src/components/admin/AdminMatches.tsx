import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trophy, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";

type M = {
  id: string;
  tournament_id: string | null;
  round: string | null;
  match_order: number | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  created_at: string;
};
type T = { id: string; name: string };
type P = { id: string; full_name: string; avatar_url: string | null };

export function AdminMatches() {
  const [tournaments, setTournaments] = useState<T[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [matches, setMatches] = useState<M[] | null>(null);
  const [playersById, setPlayersById] = useState<Record<string, P>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name")
        .in("status", ["in_progress", "pending"])
        .order("created_at", { ascending: false });
      setTournaments((data as T[]) ?? []);
      if (data && data.length > 0 && !tournamentId) setTournamentId(data[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMatches = async () => {
    if (!tournamentId) return;
    const { data } = await supabase
      .from("matches")
      .select("id, tournament_id, round, match_order, player1_id, player2_id, player1_score, player2_score, winner_id, created_at")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true });
    setMatches((data as M[]) ?? []);
    const ids = new Set<string>();
    (data ?? []).forEach((m: any) => { if (m.player1_id) ids.add(m.player1_id); if (m.player2_id) ids.add(m.player2_id); });
    if (ids.size > 0) {
      const { data: ps } = await supabase.from("players").select("id, full_name, avatar_url").in("id", [...ids]);
      const map: Record<string, P> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setPlayersById(map);
    } else {
      setPlayersById({});
    }
  };

  useEffect(() => {
    if (!tournamentId) return;
    loadMatches();
    const channel = supabase
      .channel(`admin-matches-${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` }, loadMatches)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (tournaments.length === 0) {
    return (
      <div className="glass-card p-10 text-center text-muted-foreground">
        No hay torneos en curso o pendientes. Generá un bracket primero.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 max-w-md">
        <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Torneo
        </label>
        <select
          value={tournamentId}
          onChange={e => { setTournamentId(e.target.value); setMatches(null); }}
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/40"
        >
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {matches === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : matches.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">
          Sin partidos. Generá el bracket en la pestaña Torneos.
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map(m => (
            <MatchEditor key={m.id} match={m} playersById={playersById} onSaved={loadMatches} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchEditor({ match, playersById, onSaved }: {
  match: M;
  playersById: Record<string, P>;
  onSaved: () => void;
}) {
  const [s1, setS1] = useState<string>(match.player1_score?.toString() ?? "");
  const [s2, setS2] = useState<string>(match.player2_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const p1 = match.player1_id ? playersById[match.player1_id] : null;
  const p2 = match.player2_id ? playersById[match.player2_id] : null;
  const isLocked = !!match.winner_id;
  const ready = !!match.player1_id && !!match.player2_id;

  const save = async () => {
    const a = parseInt(s1); const b = parseInt(s2);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) { toast({ title: "Scores inválidos", variant: "destructive" }); return; }
    if (a === b) { toast({ title: "No puede haber empate", variant: "destructive" }); return; }
    if (!match.player1_id || !match.player2_id) { toast({ title: "Faltan jugadores", variant: "destructive" }); return; }
    setSaving(true);
    const winner_id = a > b ? match.player1_id : match.player2_id;
    const { error } = await supabase.from("matches").update({
      player1_score: a, player2_score: b, winner_id,
    }).eq("id", match.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Resultado cargado", description: "Rating ELO actualizado automáticamente." }); onSaved(); }
  };

  return (
    <li className={cn(
      "glass-card p-4",
      isLocked && "border-success/40"
    )}>
      <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider font-heading font-semibold text-muted-foreground">
        {match.round && <span>{match.round}</span>}
        <span>· #{(match.match_order ?? 0) + 1}</span>
        {isLocked && <span className="ml-auto inline-flex items-center gap-1 text-success normal-case tracking-normal"><Trophy className="size-3" /> Resultado cargado</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <PlayerSlot player={p1} highlight={match.winner_id === match.player1_id} />
        <div className="flex items-center gap-2">
          <ScoreInput value={s1} onChange={setS1} disabled={!ready || isLocked} />
          <span className="text-muted-foreground font-heading">–</span>
          <ScoreInput value={s2} onChange={setS2} disabled={!ready || isLocked} />
        </div>
        <PlayerSlot player={p2} highlight={match.winner_id === match.player2_id} align="right" />
      </div>
      {ready && !isLocked && (
        <div className="flex justify-end mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="tap-target inline-flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="size-4" /> {saving ? "Guardando…" : "Guardar resultado"}
          </button>
        </div>
      )}
      {!ready && (
        <div className="text-xs text-muted-foreground italic mt-2">Esperando jugadores del partido anterior…</div>
      )}
    </li>
  );
}

function PlayerSlot({ player, highlight, align }: { player: P | null; highlight: boolean; align?: "right" }) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", align === "right" && "justify-end flex-row-reverse")}>
      {player ? <Avatar name={player.full_name} url={player.avatar_url} size={36} /> : <div className="size-9 rounded-full bg-muted" />}
      <span className={cn("truncate text-sm", highlight && "font-bold text-success")}>
        {player?.full_name ?? "A definir"}
      </span>
    </div>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-14 h-12 text-center font-heading font-bold text-lg tabular-nums bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
    />
  );
}
