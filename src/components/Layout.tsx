import { Navbar, BottomNav } from "./Navbar";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
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
