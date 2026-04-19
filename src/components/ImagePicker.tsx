import { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** subcarpeta dentro del bucket. Por defecto "uploads" */
  folder?: string;
  /** alto del preview en px */
  previewSize?: number;
  /** estilo del preview */
  shape?: "square" | "circle";
  className?: string;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImagePicker({
  value,
  onChange,
  folder = "uploads",
  previewSize = 96,
  shape = "square",
  className,
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Iniciá sesión para subir imágenes");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato no soportado. Usá JPG, PNG, WEBP o GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen no puede pesar más de 5MB");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "Error subiendo la imagen");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted border border-border grid place-items-center",
          radius
        )}
        style={{ width: previewSize, height: previewSize }}
      >
        {value ? (
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground/60" />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="tap-target inline-flex items-center gap-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-soft hover:bg-primary/90 transition disabled:opacity-50"
        >
          <Upload className="size-4" /> {value ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="tap-target inline-flex items-center gap-1 px-3 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition disabled:opacity-50 self-start"
          >
            <X className="size-3" /> Quitar
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP o GIF · máx 5MB</p>
      </div>
    </div>
  );
}
