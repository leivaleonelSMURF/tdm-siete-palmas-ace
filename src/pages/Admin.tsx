import { useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminGuard } from "@/components/AdminGuard";
import { Shield, Trophy, Newspaper, Users, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminTournaments } from "@/components/admin/AdminTournaments";
import { AdminNews } from "@/components/admin/AdminNews";
import { AdminPlayers } from "@/components/admin/AdminPlayers";
import { AdminMatches } from "@/components/admin/AdminMatches";

type Tab = "tournaments" | "matches" | "news" | "players";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "tournaments", label: "Torneos", icon: Trophy },
  { key: "matches", label: "Partidos", icon: Swords },
  { key: "news", label: "Noticias", icon: Newspaper },
  { key: "players", label: "Jugadores", icon: Users },
];

const Admin = () => {
  const [tab, setTab] = useState<Tab>("tournaments");

  return (
    <AdminGuard>
      <Layout>
        <section className="container py-8 md:py-12">
          <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
            <Shield className="text-primary" /> Panel de administración
          </h1>
          <p className="text-muted-foreground mt-1">Gestioná torneos, partidos, noticias y jugadores del club.</p>

          <div className="mt-6 flex gap-1 glass-card p-1 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "tap-target px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-all whitespace-nowrap",
                  tab === key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="mt-6 animate-fade-in" key={tab}>
            {tab === "tournaments" && <AdminTournaments />}
            {tab === "matches" && <AdminMatches />}
            {tab === "news" && <AdminNews />}
            {tab === "players" && <AdminPlayers />}
          </div>
        </section>
      </Layout>
    </AdminGuard>
  );
};

export default Admin;
