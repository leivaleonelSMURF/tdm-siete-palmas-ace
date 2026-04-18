import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Swords, Plus, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type C = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  message: string | null;
  created_at: string;
};
type PlayerLite = { id: string; full_name: string; avatar_url: string | null; rating: number };

const Challenges = () => {
  const { player, loading: authLoading } = useAuth();
  const [items, setItems] = useState<C[] | null>(null);
  const [playersById, setPlayersById] = useState<Record<string, PlayerLite>>({});
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerLite[]>([]);

  const load = async () => {
    if (!player) return;
    const { data } = await supabase
      .from("challenges")
      .select("id, challenger_id, challenged_id, status, message, created_at")
      .or(`challenger_id.eq.${player.id},challenged_id.eq.${player.id}`)
      .order("created_at", { ascending: false });
    setItems((data as C[]) ?? []);

    const ids = new Set<string>();
    (data ?? []).forEach((c: any) => { ids.add(c.challenger_id); ids.add(c.challenged_id); });
    if (ids.size > 0) {
      const { data: ps } = await supabase.from("players").select("id, full_name, avatar_url, rating").in("id", [...ids]);
      const map: Record<string, PlayerLite> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setPlayersById(map);
    }
  };

  useEffect(() => {
    if (!player) { setItems([]); return; }
    load();
    const channel = supabase
      .channel(`challenges-${player.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  useEffect(() => {
    if (!creating || !player) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id, full_name, avatar_url, rating")
        .neq("id", player.id)
        .order("rating", { ascending: false });
      setAllPlayers((data as PlayerLite[]) ?? []);
    })();
  }, [creating, player?.id]);

  const updateStatus = async (id: string, status: C["status"]) => {
    const { error } = await supabase.from("challenges").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const sendChallenge = async (oppId: string) => {
    if (!player) return;
    const { error } = await supabase.from("challenges").insert({
      challenger_id: player.id,
      challenged_id: oppId,
      status: "pending",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Desafío enviado" });
      setCreating(false);
      setQ("");
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-8 md:py-12">
          <Skeleton className="h-12 w-64" />
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <section className="container py-20 text-center">
          <Swords className="size-12 text-primary mx-auto mb-4" />
          <h1 className="font-heading font-bold text-2xl">Iniciá sesión para desafiar</h1>
          <p className="text-muted-foreground mt-2">Necesitás una cuenta para enviar y recibir desafíos.</p>
          <Link to="/auth" className="inline-block mt-5 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
            Ingresar
          </Link>
        </section>
      </Layout>
    );
  }

  const incoming = (items ?? []).filter(c => c.challenged_id === player.id && c.status === "pending");
  const outgoing = (items ?? []).filter(c => c.challenger_id === player.id);
  const opponents = allPlayers.filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
            <Swords className="text-primary" /> Desafíos
          </h1>
          <button
            onClick={() => setCreating(c => !c)}
            className="tap-target inline-flex items-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 active:opacity-75 transition-all"
          >
            <Plus className="size-4" /> Nuevo desafío
          </button>
        </div>

        {creating && (
          <div className="glass-card p-5 mt-5 animate-slide-down">
            <h3 className="font-heading font-semibold mb-3">Elegí un jugador</h3>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 mb-3"
            />
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {opponents.map(p => (
                <button
                  key={p.id}
                  onClick={() => sendChallenge(p.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted active:opacity-75 transition-colors text-left tap-target"
                >
                  <Avatar name={p.full_name} url={p.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">Rating {p.rating}</div>
                  </div>
                </button>
              ))}
              {opponents.length === 0 && <div className="text-sm text-muted-foreground p-3">Sin resultados.</div>}
            </div>
          </div>
        )}

        {items === null ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <h2 className="font-heading font-semibold text-xl mt-8 mb-3">Desafíos recibidos</h2>
                <ul className="space-y-3">
                  {incoming.map(c => {
                    const opp = playersById[c.challenger_id];
                    if (!opp) return null;
                    return (
                      <li key={c.id} className="glass-card p-4 flex items-center gap-3">
                        <Avatar name={opp.full_name} url={opp.avatar_url} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{opp.full_name} te desafió</div>
                          <div className="text-xs text-muted-foreground">Pendiente de tu respuesta</div>
                        </div>
                        <button onClick={() => updateStatus(c.id, "accepted")} className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-success text-success-foreground font-semibold hover:bg-success/90 active:opacity-75 transition">
                          <Check className="size-4" />Aceptar
                        </button>
                        <button onClick={() => updateStatus(c.id, "rejected")} className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-destructive/15 text-destructive font-semibold hover:bg-destructive/25 active:opacity-75 transition">
                          <X className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <h2 className="font-heading font-semibold text-xl mt-8 mb-3">Mis desafíos enviados</h2>
            <ul className="space-y-3">
              {outgoing.length === 0 && <li className="glass-card p-6 text-center text-muted-foreground">Aún no enviaste ningún desafío.</li>}
              {outgoing.map(c => {
                const opp = playersById[c.challenged_id];
                if (!opp) return null;
                const tone = {
                  pending: { cls: "bg-warning/20 text-warning-foreground", label: "Pendiente", Icon: Clock },
                  accepted: { cls: "bg-success/15 text-success", label: "Aceptado", Icon: Check },
                  rejected: { cls: "bg-destructive/15 text-destructive", label: "Rechazado", Icon: X },
                  completed: { cls: "bg-muted text-muted-foreground", label: "Completado", Icon: Check },
                }[c.status];
                return (
                  <li key={c.id} className="glass-card p-4 flex items-center gap-3">
                    <Avatar name={opp.full_name} url={opp.avatar_url} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{opp.full_name}</div>
                      <div className="text-xs text-muted-foreground">Desafío enviado</div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", tone.cls)}>
                      <tone.Icon className="size-3" />{tone.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </Layout>
  );
};

export default Challenges;
