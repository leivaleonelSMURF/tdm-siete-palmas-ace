import { Layout } from "@/components/Layout";
import { UserPlus } from "lucide-react";

const Register = () => (
  <Layout>
    <section className="container py-12 max-w-md">
      <h1 className="font-heading font-bold text-3xl flex items-center gap-2">
        <UserPlus className="text-primary" /> Registro
      </h1>
      <p className="text-muted-foreground mt-1">Sumate al club y empezá a jugar torneos.</p>
      <form className="glass-card p-6 mt-6 space-y-4" onSubmit={e => { e.preventDefault(); alert("Pronto: registro real con Lovable Cloud."); }}>
        <div>
          <label className="text-sm font-medium block mb-1">Nombre completo</label>
          <input className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" placeholder="Tu nombre" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Email</label>
          <input type="email" className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" placeholder="vos@email.com" />
        </div>
        <button className="tap-target w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 active:opacity-75 transition">
          Crear cuenta
        </button>
      </form>
    </section>
  </Layout>
);

export default Register;
