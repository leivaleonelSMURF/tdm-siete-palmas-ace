import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "./Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { loading, user, player } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/admin" replace />;

  if (!player?.is_admin) {
    return (
      <Layout>
        <section className="container py-20 text-center max-w-md mx-auto">
          <ShieldAlert className="size-12 text-destructive mx-auto mb-4" />
          <h1 className="font-heading font-bold text-2xl">Acceso restringido</h1>
          <p className="text-muted-foreground mt-2">
            Esta sección es solo para administradores del club.
          </p>
        </section>
      </Layout>
    );
  }

  return <>{children}</>;
}
