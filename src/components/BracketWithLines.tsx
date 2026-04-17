import { Link } from "react-router-dom";
import { Match, playersById } from "@/lib/mockData";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { matches: Match[] };

const ROUND_ORDER = ["Cuartos", "Semifinal", "Final"];

export function BracketWithLines({ matches }: Props) {
  const grouped = ROUND_ORDER.map(r => matches.filter(m => m.round === r));
  const colW = 220;
  const gap = 64;
  const cardH = 92;
  const vGapBase = 24;

  // vertical gap doubles per round so children align with parents
  const cols = grouped.map((round, ri) => {
    const vGap = vGapBase * Math.pow(2, ri) + cardH * (Math.pow(2, ri) - 1);
    return round.map((m, i) => {
      const y = i * (cardH + vGap) + (Math.pow(2, ri) - 1) * (cardH + vGapBase) / 2;
      const x = ri * (colW + gap);
      return { m, x, y };
    });
  });

  const totalH = Math.max(
    ...cols.map(c => c.length ? c[c.length - 1].y + cardH : 0)
  );
  const totalW = grouped.length * colW + (grouped.length - 1) * gap;

  return (
    <div className="scroll-x">
      <div className="relative" style={{ width: totalW, height: totalH, minWidth: totalW }}>
        {/* Connector lines */}
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
              const stroke = "hsl(var(--primary) / 0.35)";
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
              {ROUND_ORDER[ri]}
            </div>
            {round.map(({ m, x, y }) => {
              const p1 = playersById[m.player1_id];
              const p2 = playersById[m.player2_id];
              const w = m.winner_id;
              return (
                <Link
                  key={m.id}
                  to={`/torneo/${m.tournament_id}`}
                  className="absolute glass-card glass-card-hover bg-card flex flex-col justify-center px-3 py-2"
                  style={{ left: x, top: y, width: colW, height: cardH }}
                >
                  <Row name={p1?.full_name ?? "TBD"} score={m.player1_score} winner={w === m.player1_id} pending={!w} />
                  <div className="my-1 h-px bg-border/60" />
                  <Row name={p2?.full_name ?? "TBD"} score={m.player2_score} winner={w === m.player2_id} pending={!w} />
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
        {winner && <Trophy className="size-3.5 text-warning" />}
        {name}
      </span>
      <span className={cn(
        "tabular-nums font-heading text-sm px-2 py-0.5 rounded-md",
        winner ? "bg-success/15 text-success" : pending ? "text-muted-foreground" : "bg-muted text-foreground/70"
      )}>
        {pending ? "—" : score}
      </span>
    </div>
  );
}
