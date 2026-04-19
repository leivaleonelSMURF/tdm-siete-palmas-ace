import { Layout } from "@/components/Layout";
import { Trophy, Swords, BarChart3 } from "lucide-react";

const Reglas = () => {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <h1 className="font-heading font-bold text-4xl md:text-5xl mb-6">Reglas y sistema de puntos</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Todo lo que necesitás saber sobre cómo se calcula el ranking, los puntajes de torneos y las variaciones por partido.
        </p>

        {/* Puntos por instancia */}
        <section className="glass-card p-6 mb-8">
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2 mb-4">
            <Trophy className="text-warning" /> Puntos por instancia alcanzada
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Instancia</th>
                  <th className="text-right py-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-2">Campeón</td><td className="text-right font-bold">30</td></tr>
                <tr><td className="py-2">Sub‑Campeón</td><td className="text-right font-bold">25</td></tr>
                <tr><td className="py-2">Tercero</td><td className="text-right font-bold">21</td></tr>
                <tr><td className="py-2">4° de final</td><td className="text-right font-bold">17</td></tr>
                <tr><td className="py-2">8° de final</td><td className="text-right font-bold">13</td></tr>
                <tr><td className="py-2">16° de final</td><td className="text-right font-bold">10</td></tr>
                <tr><td className="py-2">32° de final</td><td className="text-right font-bold">8</td></tr>
                <tr><td className="py-2">64° de final</td><td className="text-right font-bold">6</td></tr>
                <tr><td className="py-2">128° de final</td><td className="text-right font-bold">4</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            ⚠️ Partido perdido en fase de grupos: <strong>-2 puntos</strong>. <br />
            El 4° de grupo obtiene el puntaje correspondiente a la instancia eliminatoria en la que comenzó.
          </p>
        </section>

        {/* Sistema de rating ELO */}
        <section className="glass-card p-6 mb-8">
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2 mb-4">
            <BarChart3 className="text-primary" /> Sistema de rating (ELO)
          </h2>
          <p className="mb-4">
            Al participar en tu primer torneo, se te asigna un <strong>rating inicial de 600 puntos</strong>. 
            Luego, cada partido modifica tu puntaje según la diferencia de rating entre tú y tu rival.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Diferencia de puntos</th>
                  <th className="text-center py-2">Gana el de mayor rating</th>
                  <th className="text-center py-2">Gana el de menor rating</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>750 o más</td><td className="text-center">+1 / –1</td><td className="text-center">+28 / –28</td></tr>
                <tr><td>500 – 749</td><td className="text-center">+2 / –2</td><td className="text-center">+26 / –26</td></tr>
                <tr><td>400 – 499</td><td className="text-center">+3 / –3</td><td className="text-center">+24 / –24</td></tr>
                <tr><td>300 – 399</td><td className="text-center">+4 / –4</td><td className="text-center">+22 / –22</td></tr>
                <tr><td>200 – 299</td><td className="text-center">+5 / –5</td><td className="text-center">+20 / –20</td></tr>
                <tr><td>150 – 199</td><td className="text-center">+6 / –6</td><td className="text-center">+18 / –18</td></tr>
                <tr><td>100 – 149</td><td className="text-center">+7 / –7</td><td className="text-center">+16 / –16</td></tr>
                <tr><td>50 – 99</td><td className="text-center">+8 / –8</td><td className="text-center">+14 / –14</td></tr>
                <tr><td>25 – 49</td><td className="text-center">+9 / –9</td><td className="text-center">+12 / –12</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            📌 Ejemplo: Si tu rating es 600 y enfrentás a uno de 500 (diferencia 100), y ganás (siendo el de mayor rating), sumás 7 puntos. Si perdés, restás 7.
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="font-heading font-bold text-2xl flex items-center gap-2 mb-4">
            <Swords className="text-accent" /> División por niveles
          </h2>
          <p>Próximamente: rangos de rating para cada división (Principiante, Intermedio, Avanzado, Elite).</p>
        </section>
      </div>
    </Layout>
  );
};

export default Reglas;
