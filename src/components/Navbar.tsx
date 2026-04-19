import { NavLink, Link } from "react-router-dom";
import { Home, Trophy, BarChart3, Newspaper, Swords, User, LogIn, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "./Avatar";
import { NotificationsBell } from "./NotificationsBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/torneos", label: "Torneos", icon: Trophy },
  { to: "/rankings", label: "Ranking", icon: BarChart3 },
  { to: "/desafios", label: "Desafíos", icon: Swords },
  { to: "/noticias", label: "Noticias", icon: Newspaper },
];

export function Navbar() {
  const { user, player, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border/60">
      <nav className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
          <span className="grid place-items-center size-9 rounded-xl hero-gradient text-primary-foreground shadow-soft">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="9" cy="11" r="6" /><path d="m13 15 6 6" /><circle cx="19" cy="6" r="2" />
            </svg>
          </span>
          <span className="hidden sm:inline">TDM <span className="text-accent">Siete Palmas</span></span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) => cn(
                  "tap-target inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-medium transition-colors",
                  "hover:bg-muted active:opacity-75",
                  isActive ? "bg-primary/10 text-primary" : "text-foreground/70"
                )}
              >
                <Icon className="size-4" />{label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {user && player && <NotificationsBell />}
          {user && player ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted active:opacity-75 transition-colors tap-target">
                <Avatar name={player.full_name} url={player.avatar_url} size={32} />
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{player.full_name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-heading">{player.full_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/jugador/${player.id}`} className="cursor-pointer"><User className="size-4" /> Mi perfil</Link>
                </DropdownMenuItem>
                {player.is_admin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer"><Shield className="size-4" /> Panel admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {/* Acceso discreto al login admin para cualquier visitante */}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="size-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="tap-target inline-flex items-center gap-2 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-soft hover:bg-primary/90 active:opacity-75 transition-colors"
            >
              <LogIn className="size-4" /><span className="hidden sm:inline">Entrar</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/60 safe-bottom">
      <ul className="grid grid-cols-5">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors active:opacity-75 tap-target",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("size-5", isActive && "animate-bounce-subtle")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
