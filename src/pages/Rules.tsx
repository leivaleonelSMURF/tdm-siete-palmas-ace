import { Layout } from "@/components/Layout";
import { BookOpen } from "lucide-react";

const RULES = [
  { t: "Formato de partido", d: "Mejor de 5 sets a 11 puntos. Diferencia de 2 puntos para cerrar el set." },
  { t: "Saque", d: "Se alternan dos saques. Al 10-10 se alterna saque cada punto." },
  { t: "Conducta", d: "Respeto al rival y al árbitro. Espíritu deportivo siempre." },
  { t: "Inscripciones", d: "Las inscripciones cierran 24hs antes del torneo. Cupos limitados." },
  { t: "Ranking", d: "Se actualiza tras cada torneo. Las victorias frente a jugadores mejor rankeados otorgan más puntos." },
];

const Rules = () => (
  <Layout>
    <section className="container py-8 md:py-12 max-w-3xl">
      <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
        <BookOpen className="text-primary" /> Reglas del club
      </h1>
      <ul className="mt-6 space-y-3">
        {RULES.map((r, i) => (
          <li key={r.t} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <h3 className="font-heading font-semibold text-lg">{r.t}</h3>
            <p className="text-muted-foreground mt-1">{r.d}</p>
          </li>
        ))}
      </ul>
    </section>
  </Layout>
);

export default Rules;
