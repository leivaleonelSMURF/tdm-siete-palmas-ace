import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Shield, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);

const AdminAuth = () => {
  const nav = useNavigate();
  const { user, player, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Si ya está logueado y es admin → al panel.
  useEffect(() => {
    if (loading) return;
    if (user && player?.is_admin) nav("/admin/panel", { replace: true });
  }, [user, player, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailP = emailSchema.safeParse(email);
    if (!emailP.success) return toast.error(emailP.error.issues[0].message);
    const passP = passwordSchema.safeParse(password);
    if (!passP.success) return toast.error(passP.error.issues[0].message);

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailP.data,
        password: passP.data,
      });
      if (error) throw error;
      // Verificar que sea admin
      const { data: pl } = await supabase
        .from("players")
        .select("is_admin")
        .eq("user_id", data.user!.id)
        .maybeSingle();
      if (!pl?.is_admin) {
        await supabase.auth.signOut();
        toast.error("Esta cuenta no tiene permisos de administrador");
        return;
      }
      toast.success("Bienvenido al panel admin");
      nav("/admin/panel", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "Error de autenticación";
      if (msg.includes("Invalid login")) toast.error("Email o contraseña incorrectos");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <section className="container max-w-md py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" /> Volver al sitio
        </Link>

        <div className="glass-card p-6 md:p-8 animate-fade-in border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid place-items-center size-11 rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Shield className="size-5" />
            </span>
            <div>
              <h1 className="font-heading font-bold text-2xl">Acceso administrador</h1>
              <p className="text-xs text-muted-foreground">Solo personal autorizado del club</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="admin@club.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Entrar al panel
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            ¿Sos jugador? <Link to="/auth" className="text-primary font-medium hover:underline">Iniciá sesión normal</Link>
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default AdminAuth;
