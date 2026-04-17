import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "lucide-react";

const NotFound = () => (
  <Layout>
    <section className="container py-24 text-center">
      <div className="font-heading font-bold text-7xl text-primary">404</div>
      <h1 className="font-heading font-bold text-2xl mt-4">Página no encontrada</h1>
      <p className="text-muted-foreground mt-2">La página que buscás no existe o fue movida.</p>
      <Link to="/" className="tap-target inline-flex items-center gap-2 mt-6 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 active:opacity-75 transition">
        <Home className="size-4" />Volver al inicio
      </Link>
    </section>
  </Layout>
);

export default NotFound;
