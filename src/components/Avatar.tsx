import { cn, initials, avatarColor } from "@/lib/utils";

type Props = {
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
  url?: string | null;
};

export function Avatar({ name, size = 40, className, ring, url }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center font-heading font-semibold text-primary-foreground rounded-full select-none shrink-0 overflow-hidden",
        ring && "ring-2 ring-background shadow-soft",
        className
      )}
      style={{
        width: size,
        height: size,
        background: url ? undefined : avatarColor(name),
        fontSize: Math.round(size * 0.38),
      }}
      aria-label={name}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
