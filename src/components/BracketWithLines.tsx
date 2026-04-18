import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type BracketMatch = {
  id: string;
  tournament_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  round: string | null;
  match_order: number | null;
};

type Props = {
  matches: BracketMatch[];
  playersById: Record<string, { id: string; full_name: string }>;
};

// Order rounds by appearance (count desc); fallback names supported.
function deriveRoundOrder(matches: BracketMatch[]): string[] {
  const counts = new Map<string, number>();
  matches.forEach(m => {
    if (!m.round) return;
    counts.set(m.round, (counts.get(m.round) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
}

export function BracketWithLines({ matches, playersById }: Props) {
  const roundOrder = deriveRoundOrder(matches);
  if (roundOrder.length === 0) {
    return <div className="text-sm text-muted-foreground italic text-center py-8">Aún no hay partidos en este bracket.</div>;
  }
  const grouped = roundOrder.map(r =>
    matches.filter(m => m.round === r).sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
  );
  const colW = 220;
  const gap = 64;
  const cardH = 92;
  const vGapBase = 24;

  const cols = grouped.map((round, ri) => {
    const vGap = vGapBase * Math.pow(2, ri) + cardH * (Math.pow(2, ri) - 1);
    return round.map((m, i) => {
      const y = i * (cardH + vGap) + (Math.pow(2, ri) - 1) * (cardH + vGapBase) / 2;
      const x = ri * (colW + gap);
      return { m, x, y };
    });
  });

  const totalH = Math.max(...cols.map(c => (c.length ? c[c.length - 1].y + cardH : 0)), cardH);
  const totalW = grouped.length * colW + (grouped.length - 1) * gap;

  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="relative" style={{ width: totalW, height: totalH, minWidth: totalW }}>
        <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
          {cols.slice(0, -1).map((round, ri) =>
            round.map((node, i) => {
              if (i % 2 === 1) return null;
              const sib = round[i + 1];
              if (!sib) return null;
              const child = cols[ri + 1]?.[Math.floor(i / 2)];
              if (!child) return null;
              const x1 = node.x + colW;
              const x2 = child.x;
              const xm = (x1 + x2) / 2;
              const y1 = node.y + cardH / 2;
              const y2 = sib.y + cardH / 2;
              const yc = child.y + cardH / 2;
              const completed = !!(node.m.winner_id && sib.m.winner_id);
              const stroke = completed ? "hsl(var(--success) / 0.5)" : "hsl(var(--primary) / 0.35)";
              return (
                <g key={`${ri}-${i}`} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round">
                  <path d={`M${x1},${y1} L${xm},${y1}`} />
                  <path d={`M${x1},${y2} L${xm},${y2}`} />
                  <path d={`M${xm},${y1} L${xm},${y2}`} />
                  <path d={`M${xm},${yc} L${x2},${yc}`} />
                </g>
              );
            })
          )}
        </svg>

        {cols.map((round, ri) => (
          <div key={ri}>
            <div
              className="absolute text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ left: ri * (colW + gap), top: -28, width: colW }}
            >
              {roundOrder[ri]}
            </div>
            {round.map(({ m, x, y }) => {
              const p1 = m.player1_id ? playersById[m.player1_id] : null;
              const p2 = m.player2_id ? playersById[m.player2_id] : null;
              const w = m.winner_id;
              return (
                <Link
                  key={m.id}
                  to={`/torneo/${m.tournament_id}`}
                  className={cn(
                    "absolute glass-card glass-card-hover bg-card flex flex-col justify-center px-3 py-2",
                    w && "border-success/40"
                  )}
                  style={{ left: x, top: y, width: colW, height: cardH }}
                >
                  <Row name={p1?.full_name ?? "A definir"} score={m.player1_score ?? 0} winner={w === m.player1_id} pending={!w} />
                  <div className="my-1 h-px bg-border/60" />
                  <Row name={p2?.full_name ?? "A definir"} score={m.player2_score ?? 0} winner={w === m.player2_id} pending={!w} />
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ name, score, winner, pending }: { name: string; score: number; winner: boolean; pending: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2", winner && "font-semibold")}>
      <span className="truncate text-sm flex items-center gap-1.5">
        {winner && <Trophy className="size-3.5 text-warning shrink-0" />}
        <span className="truncate">{name}</span>
      </span>
      <span className={cn(
        "tabular-nums font-heading text-sm px-2 py-0.5 rounded-md shrink-0",
        winner ? "bg-success/15 text-success" : pending ? "text-muted-foreground" : "bg-muted text-foreground/70"
      )}>
        {pending ? "—" : score}
      </span>
    </div>
  );
}
