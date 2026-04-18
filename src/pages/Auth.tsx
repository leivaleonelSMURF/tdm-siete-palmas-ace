import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(80);

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailP = emailSchema.safeParse(email);
    if (!emailP.success) return toast.error(emailP.error.issues[0].message);
    const passP = passwordSchema.safeParse(password);
    if (!passP.success) return toast.error(passP.error.issues[0].message);
    if (mode === "signup") {
      const nameP = nameSchema.safeParse(fullName);
      if (!nameP.success) return toast.error(nameP.error.issues[0].message);
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailP.data,
          password: passP.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Iniciando sesión…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailP.data,
          password: passP.data,
        });
        if (error) throw error;
        toast.success("¡Bienvenido!");
      }
      nav("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "Error de autenticación";
      if (msg.includes("already registered")) toast.error("Ese email ya está registrado");
      else if (msg.includes("Invalid login")) toast.error("Email o contraseña incorrectos");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <section className="container max-w-md py-12 md:py-20">
        <div className="glass-card p-6 md:p-8 animate-fade-in">
          <h1 className="font-heading font-bold text-2xl md:text-3xl">
            {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "signin"
              ? "Ingresá para desafiar y subir en el ranking."
              : "Registrate y empezá a competir hoy."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre completo</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="pl-9 h-11"
                    placeholder="Lucas Fernández"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="vos@ejemplo.com"
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
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                ¿No tenés cuenta?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Registrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                  Iniciar sesión
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Volver al inicio</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
