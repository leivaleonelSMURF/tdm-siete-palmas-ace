import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { NewsCategoryBadge } from "@/components/NewsCategoryBadge";
import { news } from "@/lib/mockData";

const NewsDetail = () => {
  const { id = "" } = useParams();
  const n = news.find(x => x.id === id);
  if (!n) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Noticia no encontrada.</p>
          <Link to="/noticias" className="text-primary font-medium mt-3 inline-block">Volver a noticias</Link>
        </div>
      </Layout>
    );
  }
  return (
    <Layout>
      <article className="container py-8 md:py-12 max-w-3xl">
        <Link to="/noticias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Noticias
        </Link>
        <NewsCategoryBadge title={n.title} />
        <h1 className="font-heading font-bold text-3xl md:text-5xl mt-2 text-balance">{n.title}</h1>
        <div className="text-sm text-muted-foreground mt-2">{format(new Date(n.created_at), "d 'de' MMMM yyyy", { locale: es })}</div>
        {n.image_url && (
          <div className="mt-6 rounded-2xl overflow-hidden glass-card">
            <img src={n.image_url} alt={n.title} className="w-full aspect-[16/9] object-cover" />
          </div>
        )}
        <div className="prose prose-lg mt-6 text-foreground/90 leading-relaxed text-balance">
          {n.content}
        </div>
      </article>
    </Layout>
  );
};

export default NewsDetail;
