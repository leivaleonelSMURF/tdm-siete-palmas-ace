import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { tournaments, Tournament } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const STATUS: Record<Tournament["status"], { label: string; cls: string }> = {
  in_progress: { label: "En curso", cls: "bg-success/15 text-success" },
  pending: { label: "Próximo", cls: "bg-primary/12 text-primary" },
  finished: { label: "Finalizado", cls: "bg-muted text-muted-foreground" },
};

const FILTERS: { key: Tournament["status"] | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "in_progress", label: "En curso" },
  { key: "pending", label: "Próximos" },
  { key: "finished", label: "Finalizados" },
];

const Tournaments = () => {
  const [filter, setFilter] = useState<Tournament["status"] | "all">("all");
  const list = filter === "all" ? tournaments : tournaments.filter(t => t.status === filter);

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

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((t, i) => (
            <Link
              key={t.id}
              to={`/torneo/${t.id}`}
              className="glass-card glass-card-hover p-5 flex flex-col gap-3 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn("text-xs font-heading font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", STATUS[t.status].cls)}>
                  {STATUS[t.status].label}
                </span>
                {t.challonge_slug && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">Challonge</span>
                )}
              </div>
              <h3 className="font-heading font-bold text-lg text-balance">{t.name}</h3>
              <div className="text-sm text-muted-foreground">{t.format}</div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" /> {t.participants}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {format(new Date(t.starts_at), "d MMM", { locale: es })}
                </span>
              </div>
              <div className="text-sm text-primary font-medium inline-flex items-center gap-1">
                Ver bracket <ArrowRight className="size-4" />
              </div>
            </Link>
          ))}
        </div>

        {list.length === 0 && (
          <div className="mt-8 glass-card p-8 text-center text-muted-foreground">Sin torneos en esta categoría.</div>
        )}
      </section>
    </Layout>
  );
};

export default Tournaments;
