import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Trophy, Users, Calendar, Swords, ListOrdered } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { BracketWithLines } from "@/components/BracketWithLines";
import { tournaments, matchesByTournament, playersById, players } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type Tab = "bracket" | "matches" | "participants";

const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: "bracket", label: "Bracket", icon: Trophy },
  { key: "matches", label: "Partidos", icon: Swords },
  { key: "participants", label: "Participantes", icon: ListOrdered },
];

const TournamentDetail = () => {
  const { id = "" } = useParams();
  const t = tournaments.find(x => x.id === id);
  const [tab, setTab] = useState<Tab>("bracket");

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

  const tMatches = matchesByTournament(t.id);
  // Participants for mock t1 — pull unique player ids from matches
  const participantIds = Array.from(new Set(tMatches.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean))) as string[];
  const participantList = participantIds.map(pid => playersById[pid]).filter(Boolean);
  const fallbackParticipants = participantList.length ? participantList : players.slice(0, t.participants);

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <Link to="/torneos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Torneos
        </Link>

        <div className="glass-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-heading font-bold text-3xl md:text-4xl">{t.name}</h1>
              <div className="text-muted-foreground mt-1">{t.format}</div>
            </div>
            <span className={cn(
              "text-xs font-heading font-semibold uppercase tracking-wider px-3 py-1 rounded-full",
              t.status === "in_progress" && "bg-success/15 text-success",
              t.status === "pending" && "bg-primary/12 text-primary",
              t.status === "finished" && "bg-muted text-muted-foreground",
            )}>
              {t.status === "in_progress" ? "En curso" : t.status === "pending" ? "Próximo" : "Finalizado"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{t.participants} jugadores</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="size-4" />{format(new Date(t.starts_at), "d 'de' MMMM yyyy", { locale: es })}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 inline-flex glass-card p-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "tap-target px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-all",
                tab === key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>

        <div className="mt-6 animate-fade-in" key={tab}>
          {tab === "bracket" && (
            <div className="glass-card p-6 pt-10">
              {tMatches.length > 0
                ? <BracketWithLines matches={tMatches} />
                : <div className="text-center text-muted-foreground py-8">El bracket todavía no fue generado.</div>}
            </div>
          )}

          {tab === "matches" && (
            <div className="space-y-3">
              {tMatches.length === 0 && <div className="glass-card p-8 text-center text-muted-foreground">Sin partidos.</div>}
              {tMatches.map(m => {
                const p1 = playersById[m.player1_id];
                const p2 = playersById[m.player2_id];
                return (
                  <div key={m.id} className="glass-card p-4 flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground w-20 shrink-0 font-heading font-semibold">{m.round}</span>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar name={p1?.full_name ?? ""} size={32} />
                        <span className={cn("truncate text-sm", m.winner_id === p1?.id && "font-semibold")}>{p1?.full_name ?? "TBD"}</span>
                      </div>
                      <span className="font-heading font-bold tabular-nums text-base px-3 py-1 rounded-full bg-muted/60">
                        {m.winner_id ? `${m.player1_score}–${m.player2_score}` : "—"}
                      </span>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                        <span className={cn("truncate text-sm", m.winner_id === p2?.id && "font-semibold")}>{p2?.full_name ?? "TBD"}</span>
                        <Avatar name={p2?.full_name ?? ""} size={32} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "participants" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fallbackParticipants.map(p => (
                <Link key={p.id} to={`/jugador/${p.id}`} className="glass-card glass-card-hover p-3 flex items-center gap-3">
                  <Avatar name={p.full_name} size={40} />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">Rating {p.rating}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default TournamentDetail;
