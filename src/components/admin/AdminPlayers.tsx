import { useEffect, useState } from "react";
import { Search, Edit2, Shield, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/Avatar";
import { Field, Modal, inputCls } from "./AdminTournaments";
import { ImagePicker } from "@/components/ImagePicker";

type P = {
  id: string; full_name: string; rating: number;
  avatar_url: string | null; is_admin: boolean;
  wins: number; losses: number; bio: string | null; phone: string | null;
};

export function AdminPlayers() {
  const [list, setList] = useState<P[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<P | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, full_name, rating, avatar_url, is_admin, wins, losses, bio, phone")
      .order("rating", { ascending: false });
    setList((data as P[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (p: P) => {
    if (!confirm(`${p.is_admin ? "Quitar" : "Otorgar"} permisos de admin a ${p.full_name}?`)) return;
    const { error } = await supabase.from("players").update({ is_admin: !p.is_admin }).eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Permisos actualizados" }); load(); }
  };

  const filtered = (list ?? []).filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar jugador…"
          className="w-full glass-card pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
      </div>

      {list === null ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">Sin resultados.</div>
      ) : (
        <ul className="glass-card overflow-hidden divide-y divide-border/40">
          {filtered.map(p => (
            <li key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
              <Avatar name={p.full_name} url={p.avatar_url} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {p.full_name}
                  {p.is_admin && <span className="text-[10px] uppercase font-heading font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">Admin</span>}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  Rating {p.rating} · {p.wins}G / {p.losses}P
                </div>
              </div>
              <button
                onClick={() => toggleAdmin(p)}
                className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-muted hover:bg-muted/80 transition"
                aria-label={p.is_admin ? "Quitar admin" : "Hacer admin"}
                title={p.is_admin ? "Quitar admin" : "Hacer admin"}
              >
                {p.is_admin ? <ShieldOff className="size-4 text-destructive" /> : <Shield className="size-4 text-primary" />}
              </button>
              <button
                onClick={() => setEditing(p)}
                className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-muted hover:bg-muted/80 transition"
                aria-label="Editar"
              >
                <Edit2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PlayerForm
          player={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function PlayerForm({ player, onClose, onSaved }: { player: P; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(player.full_name);
  const [bio, setBio] = useState(player.bio ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url ?? "");
  const [rating, setRating] = useState<number>(player.rating);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("players").update({
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      rating,
    }).eq("id", player.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Jugador actualizado" }); onSaved(); }
  };

  return (
    <Modal title={`Editar — ${player.full_name}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre completo"><input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} /></Field>
        <Field label="Foto de perfil">
          <ImagePicker value={avatarUrl} onChange={(u) => setAvatarUrl(u ?? "")} folder={`players/${player.id}`} previewSize={88} shape="circle" />
        </Field>
        <Field label="Bio"><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={inputCls} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Teléfono"><input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} /></Field>
          <Field label="Rating"><input type="number" value={rating} onChange={e => setRating(Number(e.target.value))} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="tap-target px-4 rounded-lg bg-muted hover:bg-muted/80 font-medium">Cancelar</button>
          <button onClick={save} disabled={saving} className="tap-target px-5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
