import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type T = {
  id: string; name: string; format: string; status: string;
  starts_at: string | null; max_players: number | null;
  description: string | null; location: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  in_progress: { label: "En curso", cls: "bg-success/15 text-success" },
  pending: { label: "Próximo", cls: "bg-primary/12 text-primary" },
  finished: { label: "Finalizado", cls: "bg-muted text-muted-foreground" },
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "in_progress", label: "En curso" },
  { key: "pending", label: "Próximos" },
  { key: "finished", label: "Finalizados" },
] as const;

const Tournaments = () => {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [tournaments, setTournaments] = useState<T[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, format, status, starts_at, max_players, description, location")
        .order("starts_at", { ascending: false, nullsFirst: false });
      setTournaments((data as T[]) ?? []);
      if (data?.length) {
        const { data: regs } = await supabase
          .from("tournament_registrations")
          .select("tournament_id")
          .in("tournament_id", data.map(d => d.id));
        const c: Record<string, number> = {};
        (regs ?? []).forEach((r: any) => { c[r.tournament_id] = (c[r.tournament_id] ?? 0) + 1; });
        setCounts(c);
      }
    })();
  }, []);

  const list = (tournaments ?? []).filter(t => filter === "all" || t.status === filter);

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
          <Trophy className="text-warning" /> Torneos
        </h1>
        <p className="text-muted-foreground mt-1">Próximos, en curso y finalizados.</p>

        <div className="mt-6 inline-flex glass-card p-1 gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all tap-target",
                filter === f.key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tournaments === null ? (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="mt-8 glass-card p-10 text-center">
            <Trophy className="mx-auto size-10 text-muted-foreground/50" />
            <div className="font-heading font-semibold mt-3">
              {tournaments.length === 0 ? "Aún no hay torneos creados" : "Sin torneos en esta categoría"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {tournaments.length === 0
                ? "El equipo del club publicará los próximos torneos por acá."
                : "Probá con otro filtro."}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((t, i) => {
              const status = STATUS[t.status] ?? STATUS.pending;
              const inscritos = counts[t.id] ?? 0;
              return (
                <Link
                  key={t.id}
                  to={`/torneo/${t.id}`}
                  className="glass-card glass-card-hover p-5 flex flex-col gap-3 animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("text-xs font-heading font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", status.cls)}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-balance">{t.name}</h3>
                  {t.description && <div className="text-sm text-muted-foreground line-clamp-2">{t.description}</div>}
                  <div className="text-sm text-muted-foreground">{formatLabel(t.format)}</div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4" /> {inscritos}{t.max_players ? `/${t.max_players}` : ""}
                    </span>
                    {t.starts_at && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        {format(new Date(t.starts_at), "d MMM", { locale: es })}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-primary font-medium inline-flex items-center gap-1">
                    Ver detalle <ArrowRight className="size-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};

function formatLabel(f: string) {
  switch (f) {
    case "single_elimination": return "Eliminación directa";
    case "double_elimination": return "Doble eliminación";
    case "round_robin": return "Round robin";
    case "swiss": return "Suizo";
    default: return f;
  }
}

export default Tournaments;
