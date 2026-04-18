import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PlayerProfile = {
  id: string;
  user_id: string;
  full_name: string;
  rating: number;
  avatar_url: string | null;
  is_admin: boolean;
  wins: number;
  losses: number;
  bio: string | null;
  phone: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  player: PlayerProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayer = async (uid: string) => {
    const { data } = await supabase
      .from("players")
      .select("id, user_id, full_name, rating, avatar_url, is_admin, wins, losses, bio, phone")
      .eq("user_id", uid)
      .maybeSingle();
    setPlayer((data as PlayerProfile | null) ?? null);
  };

  useEffect(() => {
    // Listener FIRST, then getSession
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid deadlocks
        setTimeout(() => fetchPlayer(s.user.id), 0);
      } else {
        setPlayer(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchPlayer(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setPlayer(null);
  };

  const refreshPlayer = async () => {
    if (user) await fetchPlayer(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, player, loading, signOut, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
