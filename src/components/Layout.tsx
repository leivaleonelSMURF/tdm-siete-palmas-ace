import { Navbar, BottomNav } from "./Navbar";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
        <Spinner7P className="size-16" />
        <p className="mt-4 text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <BottomNav />
      <footer className="hidden md:block container py-6 text-xs text-muted-foreground border-t border-border/50">
        © {new Date().getFullYear()} TDM Siete Palmas · Tenis de mesa recreativo
      </footer>
    </div>
  );
}

// Componente de spinner con "7P" girando
function Spinner7P({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" strokeOpacity="0.2" />
      <path
        d="M50 8 A42 42 0 0 1 92 50"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <text x="50" y="67" textAnchor="middle" fontSize="32" fontWeight="bold" fill="currentColor">
        7P
      </text>
    </svg>
  );
}
