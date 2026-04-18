import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Trophy, Swords, Newspaper, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type N = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, any> = {
  match_result: Trophy,
  challenge: Swords,
  news: Newspaper,
};

export function NotificationsBell() {
  const { player } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!player) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("player_id", player.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setItems((data as N[]) ?? []);
  };

  useEffect(() => {
    if (!player) { setItems([]); return; }
    load();
    const channel = supabase
      .channel(`notifs-${player.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `player_id=eq.${player.id}` },
        load
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  if (!player) return null;

  const unread = items.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const ids = items.filter(n => !n.read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        className="relative tap-target grid place-items-center size-10 rounded-xl hover:bg-muted active:opacity-75 transition-colors"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-heading font-bold tabular-nums animate-badge-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[28rem] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <span className="font-heading font-semibold text-sm">Notificaciones</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <Check className="size-3" /> Marcar todas
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Sparkles className="size-6 mx-auto mb-2 text-muted-foreground/60" />
              No tenés notificaciones todavía.
            </div>
          ) : (
            <ul>
              {items.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const content = (
                  <div className={cn(
                    "flex gap-3 px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/60 transition-colors cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}>
                    <span className={cn(
                      "size-8 grid place-items-center rounded-lg shrink-0",
                      !n.read ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.message && <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                      </div>
                    </div>
                    {!n.read && <span className="size-2 rounded-full bg-primary mt-2 shrink-0" aria-label="Sin leer" />}
                  </div>
                );
                const handle = () => { if (!n.read) markRead(n.id); setOpen(false); };
                return (
                  <li key={n.id} onClick={handle}>
                    {n.link
                      ? <Link to={n.link}>{content}</Link>
                      : content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
