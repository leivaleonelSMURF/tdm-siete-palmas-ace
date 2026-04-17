import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { Swords, Plus, Check, X, Clock } from "lucide-react";
import { players, playersById } from "@/lib/mockData";
import { useState } from "react";
import { cn } from "@/lib/utils";

type C = { id: string; challenger_id: string; challenged_id: string; status: "pending" | "accepted" | "rejected" | "completed" };

const seed: C[] = [
  { id: "c1", challenger_id: "p3", challenged_id: "p1", status: "pending" },
  { id: "c2", challenger_id: "p1", challenged_id: "p5", status: "accepted" },
  { id: "c3", challenger_id: "p1", challenged_id: "p8", status: "completed" },
];

const Challenges = () => {
  const me = "p1";
  const [items, setItems] = useState<C[]>(seed);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  const update = (id: string, status: C["status"]) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, status } : c));

  const opponents = players.filter(p => p.id !== me && p.full_name.toLowerCase().includes(q.toLowerCase()));

  const incoming = items.filter(c => c.challenged_id === me && c.status === "pending");
  const outgoing = items.filter(c => c.challenger_id === me);

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
                  onClick={() => {
                    setItems(prev => [...prev, { id: `c${Date.now()}`, challenger_id: me, challenged_id: p.id, status: "pending" }]);
                    setCreating(false); setQ("");
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted active:opacity-75 transition-colors text-left tap-target"
                >
                  <Avatar name={p.full_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">Rating {p.rating}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {incoming.length > 0 && (
          <>
            <h2 className="font-heading font-semibold text-xl mt-8 mb-3">Desafíos recibidos</h2>
            <ul className="space-y-3">
              {incoming.map(c => {
                const opp = playersById[c.challenger_id]!;
                return (
                  <li key={c.id} className="glass-card p-4 flex items-center gap-3">
                    <Avatar name={opp.full_name} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{opp.full_name} te desafió</div>
                      <div className="text-xs text-muted-foreground">Pendiente de tu respuesta</div>
                    </div>
                    <button onClick={() => update(c.id, "accepted")} className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-success text-success-foreground font-semibold hover:bg-success/90 active:opacity-75 transition">
                      <Check className="size-4" />Aceptar
                    </button>
                    <button onClick={() => update(c.id, "rejected")} className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-destructive/15 text-destructive font-semibold hover:bg-destructive/25 active:opacity-75 transition">
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
            const opp = playersById[c.challenged_id]!;
            const tone = {
              pending: { cls: "bg-warning/20 text-warning-foreground", label: "Pendiente", Icon: Clock },
              accepted: { cls: "bg-success/15 text-success", label: "Aceptado", Icon: Check },
              rejected: { cls: "bg-destructive/15 text-destructive", label: "Rechazado", Icon: X },
              completed: { cls: "bg-muted text-muted-foreground", label: "Completado", Icon: Check },
            }[c.status];
            return (
              <li key={c.id} className="glass-card p-4 flex items-center gap-3">
                <Avatar name={opp.full_name} size={40} />
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
      </section>
    </Layout>
  );
};

export default Challenges;
