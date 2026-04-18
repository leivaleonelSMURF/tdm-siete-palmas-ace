// Helpers to generate a single-elimination bracket
// Returns ordered match rows ready to insert into Supabase

export type GeneratedMatch = {
  id: string; // local temp id
  round: string;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  next_local_id: string | null; // links winner forward
};

const ROUND_NAMES: Record<number, string> = {
  16: "Octavos",
  8: "Cuartos",
  4: "Semifinal",
  2: "Final",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a single-elimination bracket for 4 / 8 / 16 players.
 * playerIds.length must equal 4, 8 or 16.
 */
export function generateBracket(playerIds: string[]): GeneratedMatch[] {
  const size = playerIds.length;
  if (![4, 8, 16].includes(size)) {
    throw new Error("Bracket size must be 4, 8 or 16");
  }

  const seeded = shuffle(playerIds);
  const matches: GeneratedMatch[] = [];
  const rounds: GeneratedMatch[][] = [];

  let currentSize = size;
  let order = 0;

  // Build round 1 (with players)
  const round1: GeneratedMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    round1.push({
      id: `m-${order}`,
      round: ROUND_NAMES[size],
      match_order: order++,
      player1_id: seeded[i * 2] ?? null,
      player2_id: seeded[i * 2 + 1] ?? null,
      next_local_id: null,
    });
  }
  rounds.push(round1);
  currentSize = size / 2;

  // Subsequent rounds
  while (currentSize >= 2) {
    const round: GeneratedMatch[] = [];
    for (let i = 0; i < currentSize / 2; i++) {
      round.push({
        id: `m-${order}`,
        round: ROUND_NAMES[currentSize],
        match_order: order++,
        player1_id: null,
        player2_id: null,
        next_local_id: null,
      });
    }
    rounds.push(round);
    currentSize = currentSize / 2;
  }

  // Link next_local_id: pair i and i+1 of round R go to floor(i/2) of round R+1
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].forEach((m, i) => {
      m.next_local_id = rounds[r + 1][Math.floor(i / 2)].id;
    });
  }

  rounds.forEach(r => matches.push(...r));
  return matches;
}
