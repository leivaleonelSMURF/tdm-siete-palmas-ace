import { cn } from "@/lib/utils";

const RULES: { match: RegExp; label: string; cls: string }[] = [
  { match: /torneo|copa|campeonato|liga/i, label: "Torneo", cls: "bg-primary/12 text-primary" },
  { match: /resultado|gan(ó|o)|victoria|avanza|final/i, label: "Resultado", cls: "bg-success/15 text-success" },
  { match: /nuevo|novedad|anuncio|incorpor/i, label: "Novedad", cls: "bg-accent/15 text-accent" },
];

export function NewsCategoryBadge({ title, className }: { title: string; className?: string }) {
  const rule = RULES.find(r => r.match.test(title)) ?? RULES[0];
  return (
    <span className={cn(
      "inline-flex items-center text-[11px] font-heading font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
      rule.cls,
      className
    )}>
      {rule.label}
    </span>
  );
}
