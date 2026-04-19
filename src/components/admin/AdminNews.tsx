import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, Modal, inputCls } from "./AdminTournaments";
import { ImagePicker } from "@/components/ImagePicker";

type N = {
  id: string; title: string; content: string;
  image_url: string | null; published: boolean; created_at: string;
};

export function AdminNews() {
  const [list, setList] = useState<N[] | null>(null);
  const [editing, setEditing] = useState<N | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("news")
      .select("id, title, content, image_url, published, created_at")
      .order("created_at", { ascending: false });
    setList((data as N[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (n: N) => {
    const { error } = await supabase.from("news").update({ published: !n.published }).eq("id", n.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (n: N) => {
    if (!confirm(`Eliminar noticia "${n.title}"?`)) return;
    const { error } = await supabase.from("news").delete().eq("id", n.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Noticia eliminada" }); load(); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreating(true)}
          className="tap-target inline-flex items-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-all"
        >
          <Plus className="size-4" /> Nueva noticia
        </button>
      </div>

      {list === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">No hay noticias creadas.</div>
      ) : (
        <ul className="space-y-3">
          {list.map(n => (
            <li key={n.id} className="glass-card p-4 flex items-center gap-3">
              {n.image_url && (
                <img src={n.image_url} alt="" className="size-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 items-center">
                  <span>{format(new Date(n.created_at), "d MMM yyyy", { locale: es })}</span>
                  <span className={n.published ? "text-success" : "text-muted-foreground"}>
                    · {n.published ? "Publicada" : "Borrador"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => togglePublished(n)}
                className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-muted hover:bg-muted/80 transition"
                aria-label={n.published ? "Despublicar" : "Publicar"}
              >
                {n.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button
                onClick={() => setEditing(n)}
                className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-muted hover:bg-muted/80 transition"
                aria-label="Editar"
              >
                <Edit2 className="size-4" />
              </button>
              <button
                onClick={() => remove(n)}
                className="tap-target inline-flex items-center justify-center size-10 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                aria-label="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <NewsForm
          news={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function NewsForm({ news, onClose, onSaved }: { news: N | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(news?.title ?? "");
  const [content, setContent] = useState(news?.content ?? "");
  const [imageUrl, setImageUrl] = useState(news?.image_url ?? "");
  const [published, setPublished] = useState(news?.published ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Faltan campos", description: "Título y contenido son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      published,
    };
    const { error } = news
      ? await supabase.from("news").update(payload).eq("id", news.id)
      : await supabase.from("news").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: news ? "Noticia actualizada" : "Noticia creada" }); onSaved(); }
  };

  return (
    <Modal title={news ? "Editar noticia" : "Nueva noticia"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Título"><input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} /></Field>
        <Field label="Imagen de portada">
          <ImagePicker value={imageUrl} onChange={(u) => setImageUrl(u ?? "")} folder="news" previewSize={120} />
        </Field>
        <Field label="Contenido"><textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className={inputCls} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="size-4 accent-primary" />
          Publicar inmediatamente
        </label>
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
