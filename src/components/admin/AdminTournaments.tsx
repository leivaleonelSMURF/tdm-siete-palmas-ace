import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Edit2, Trash2, Trophy, Zap, Calendar, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { generateBracket } from "@/lib/bracket";
import { cn } from "@/lib/utils";

type T = {
  id: string; name: string; format: string; status: string;
  starts_at: string | null; max_players: number | null;
  description: string | null; location: string | null; prize: string | null;
};
type Reg = { tournament_id: string; player_id: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Próximo", in_progress: "En curso", finished: "Finalizado",
};

export function AdminTournaments() {
  const [list, setList] = useState<T[] | null>(null);
  const [regCounts, setRegCounts] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<T | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, format, status, starts_at, max_players, description, location, prize")
      .order("created_at", { ascending: false });
    setList((data as T[]) ?? []);
    const { data: regs } = await supabase.from("tournament_registrations").select("tournament_id, player_id");
    const map: Record<string, string[]> = {};
    (regs ?? []).forEach((r: any) => {
      (map[r.tournament_id] ??= []).push(r.player_id);
    });
    setRegCounts(map);
  };

  useEffect(() => { load(); }, []);

  const remove = async (t: T) => {
    if (!confirm(`Eliminar torneo "${t.name}"? Esto borrará también sus partidos.`)) return;
    await supabase.from("matches").delete().eq("tournament_id", t.id);
    await supabase.from("tournament_registrations").delete().eq("tournament_id", t.id);
    const { error } = await supabase.from("tournaments").delete().eq("id", t.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Torneo eliminado" }); load(); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreating(true)}
          className="tap-target inline-flex items-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-all"
        >
          <Plus className="size-4" /> Nuevo torneo
        </button>
      </div>

      {list === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">No hay torneos creados aún.</div>
      ) : (
        <ul className="space-y-3">
          {list.map(t => {
            const players = regCounts[t.id] ?? [];
            return (
              <li key={t.id} className="glass-card p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/torneo/${t.id}`} className="font-heading font-semibold text-lg hover:text-primary transition-colors">
                    {t.name}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1"><Trophy className="size-3" />{STATUS_LABEL[t.status] ?? t.status}</span>
                    {t.starts_at && <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{format(new Date(t.starts_at), "d MMM yyyy", { locale: es })}</span>}
                    <span className="inline-flex items-center gap-1"><Users className="size-3" />{players.length}{t.max_players ? ` / ${t.max_players}` : ""}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setGeneratingFor(t)}
                    className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-accent/15 text-accent font-medium text-sm hover:bg-accent/25 transition"
                    title="Generar bracket"
                  >
                    <Zap className="size-4" /> Bracket
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-muted hover:bg-muted/80 transition"
                    aria-label="Editar"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <TournamentForm
          tournament={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {generatingFor && (
        <BracketGenerator
          tournament={generatingFor}
          registeredIds={regCounts[generatingFor.id] ?? []}
          onClose={() => setGeneratingFor(null)}
          onDone={() => { setGeneratingFor(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Tournament create/edit form ────────────────────────────────────────────
function TournamentForm({ tournament, onClose, onSaved }: {
  tournament: T | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tournament?.name ?? "");
  const [description, setDescription] = useState(tournament?.description ?? "");
  const [location, setLocation] = useState(tournament?.location ?? "Club Siete Palmas");
  const [prize, setPrize] = useState(tournament?.prize ?? "");
  const [maxPlayers, setMaxPlayers] = useState<number>(tournament?.max_players ?? 8);
  const [startsAt, setStartsAt] = useState(tournament?.starts_at ? tournament.starts_at.slice(0, 16) : "");
  const [status, setStatus] = useState(tournament?.status ?? "pending");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast({ title: "Falta el nombre", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      prize: prize.trim() || null,
      max_players: maxPlayers,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      status,
      format: "single_elimination",
    };
    const { error } = tournament
      ? await supabase.from("tournaments").update(payload).eq("id", tournament.id)
      : await supabase.from("tournaments").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: tournament ? "Torneo actualizado" : "Torneo creado" }); onSaved(); }
  };

  return (
    <Modal title={tournament ? "Editar torneo" : "Nuevo torneo"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Descripción"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Lugar"><input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} /></Field>
          <Field label="Premio"><input value={prize} onChange={e => setPrize(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Cupo máximo">
            <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className={inputCls}>
              {[4, 8, 16].map(n => <option key={n} value={n}>{n} jugadores</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={inputCls} /></Field>
          <Field label="Estado">
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="pending">Próximo</option>
              <option value="in_progress">En curso</option>
              <option value="finished">Finalizado</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="tap-target px-4 rounded-lg bg-muted hover:bg-muted/80 font-medium">Cancelar</button>
          <button onClick={save} disabled={saving} className="tap-target px-5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Bracket generator ──────────────────────────────────────────────────────
function BracketGenerator({ tournament, registeredIds, onClose, onDone }: {
  tournament: T;
  registeredIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [size, setSize] = useState<4 | 8 | 16>(
    registeredIds.length >= 16 ? 16 : registeredIds.length >= 8 ? 8 : 4
  );
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (registeredIds.length < size) {
      toast({ title: "Faltan jugadores", description: `Necesitás ${size} inscriptos.`, variant: "destructive" });
      return;
    }
    setGenerating(true);

    // Wipe existing matches for this tournament
    await supabase.from("matches").delete().eq("tournament_id", tournament.id);

    // Take first N registered (could be improved with ranking later)
    const playerIds = registeredIds.slice(0, size);
    const generated = generateBracket(playerIds);

    // Insert in two passes: first all matches without next_match_id, then update links
    const inserts = generated.map(g => ({
      tournament_id: tournament.id,
      round: g.round,
      match_order: g.match_order,
      player1_id: g.player1_id,
      player2_id: g.player2_id,
    }));
    const { data: inserted, error } = await supabase
      .from("matches")
      .insert(inserts)
      .select("id, match_order");

    if (error) {
      setGenerating(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Build map: local_id -> real db id (using match_order)
    const orderToRealId = new Map<number, string>();
    (inserted ?? []).forEach((r: any) => orderToRealId.set(r.match_order, r.id));
    const localIdToRealId = new Map<string, string>();
    generated.forEach(g => {
      const real = orderToRealId.get(g.match_order);
      if (real) localIdToRealId.set(g.id, real);
    });

    // Update next_match_id in second pass
    const updates = generated
      .filter(g => g.next_local_id)
      .map(g => ({
        id: localIdToRealId.get(g.id)!,
        next_match_id: localIdToRealId.get(g.next_local_id!)!,
      }));

    for (const u of updates) {
      await supabase.from("matches").update({ next_match_id: u.next_match_id }).eq("id", u.id);
    }

    // Set tournament to in_progress
    await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournament.id);

    setGenerating(false);
    toast({ title: "¡Bracket generado!", description: `${size} jugadores · ${generated.length} partidos` });
    onDone();
  };

  return (
    <Modal title={`Generar bracket — ${tournament.name}`} onClose={onClose}>
      <p className="text-sm text-muted-foreground mb-4">
        Inscriptos actuales: <strong className="text-foreground">{registeredIds.length}</strong>.
        Si ya hay un bracket, será <strong>reemplazado</strong>.
      </p>
      <Field label="Tamaño del bracket">
        <div className="flex gap-2">
          {([4, 8, 16] as const).map(n => (
            <button
              key={n}
              onClick={() => setSize(n)}
              disabled={registeredIds.length < n}
              className={cn(
                "flex-1 tap-target rounded-lg font-heading font-bold transition-all",
                size === n ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted hover:bg-muted/80",
                registeredIds.length < n && "opacity-40 cursor-not-allowed"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="tap-target px-4 rounded-lg bg-muted hover:bg-muted/80 font-medium">Cancelar</button>
        <button
          onClick={generate}
          disabled={generating || registeredIds.length < size}
          className="tap-target px-5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Zap className="size-4" /> {generating ? "Generando…" : "Generar bracket"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Shared UI helpers ──────────────────────────────────────────────────────
const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/40 transition";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl">{title}</h2>
          <button onClick={onClose} className="size-9 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export { inputCls };
