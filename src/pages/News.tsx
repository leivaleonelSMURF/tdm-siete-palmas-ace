import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Newspaper } from "lucide-react";
import { Layout } from "@/components/Layout";
import { NewsCategoryBadge } from "@/components/NewsCategoryBadge";
import { news } from "@/lib/mockData";

const News = () => {
  const [q, setQ] = useState("");
  const list = q ? news.filter(n => n.title.toLowerCase().includes(q.toLowerCase())) : news;
  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl flex items-center gap-2">
          <Newspaper className="text-primary" /> Noticias
        </h1>
        <p className="text-muted-foreground mt-1">Lo último del club Siete Palmas.</p>

        <div className="mt-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar noticia…"
            className="w-full glass-card pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 transition tap-target"
          />
        </div>

        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((n, i) => (
            <Link key={n.id} to={`/noticia/${n.id}`} className="glass-card glass-card-hover overflow-hidden group animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                {n.image_url && <img src={n.image_url} alt={n.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              </div>
              <div className="p-4">
                <NewsCategoryBadge title={n.title} className="mb-2" />
                <h3 className="font-heading font-semibold text-balance">{n.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.excerpt}</p>
                <div className="text-xs text-muted-foreground mt-2">{format(new Date(n.created_at), "d MMM yyyy", { locale: es })}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default News;
