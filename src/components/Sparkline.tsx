import { cn } from "@/lib/utils";

type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
};

export function Sparkline({ values, width = 80, height = 24, className, strokeWidth = 1.6 }: Props) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const areaD = `${d} L${width},${height} L0,${height} Z`;
  const trendUp = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden="true">
      <path d={areaD} fill={trendUp ? "hsl(var(--success) / 0.15)" : "hsl(var(--destructive) / 0.12)"} />
      <path d={d} fill="none" stroke={trendUp ? "hsl(var(--success))" : "hsl(var(--destructive))"} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
