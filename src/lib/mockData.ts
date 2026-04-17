// Deterministic mock data for TDM Siete Palmas.
// Replace with Supabase queries when Cloud is enabled.

export type Player = {
  id: string;
  full_name: string;
  rating: number;
  avatar_url?: string;
  wins: number;
  losses: number;
  history: number[]; // last 10 rating points (for sparkline)
  streak: number; // current win streak
};

export type Match = {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string;
  set_scores: { p1: number; p2: number }[];
  round: string;
  tournament_id: string;
  created_at: string;
  match_order: number;
};

export type Tournament = {
  id: string;
  name: string;
  format: "Eliminación directa" | "Round robin" | "Suizo";
  status: "pending" | "in_progress" | "finished";
  starts_at: string;
  participants: number;
  challonge_slug?: string | null;
};

export type News = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url?: string;
  created_at: string;
};

export type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
};

const NAMES = [
  "Lucas Fernández", "Martín Acosta", "Sofía Romero", "Diego Pérez",
  "Camila Vega", "Federico Núñez", "Julián Ríos", "Valentina Cruz",
  "Mateo Gómez", "Joaquín Silva", "Tomás Aguirre", "Renata Bauer",
  "Nicolás Ferreyra", "Agustín Quintana", "Bruno Méndez", "Emilia Sosa",
];

const seedHistory = (base: number, seed: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const noise = Math.sin(seed * 13 + i * 7) * 18;
    const trend = (i - 5) * 1.4;
    return Math.round(base - 14 + trend + noise);
  });

export const players: Player[] = NAMES.map((name, i) => {
  const rating = 1850 - i * 32 + (i % 3) * 11;
  return {
    id: `p${i + 1}`,
    full_name: name,
    rating,
    wins: 28 - i + (i % 4) * 3,
    losses: 6 + i + (i % 3),
    history: seedHistory(rating, i + 1),
    streak: i === 0 ? 6 : i === 1 ? 4 : i === 4 ? 3 : 0,
    avatar_url: undefined,
  };
});

export const tournaments: Tournament[] = [
  {
    id: "t1",
    name: "Copa Otoño 2025",
    format: "Eliminación directa",
    status: "in_progress",
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    participants: 8,
    challonge_slug: null,
  },
  {
    id: "t2",
    name: "Torneo Apertura Siete Palmas",
    format: "Round robin",
    status: "pending",
    starts_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6 + 1000 * 60 * 60 * 5).toISOString(),
    participants: 12,
    challonge_slug: null,
  },
  {
    id: "t3",
    name: "Liga Verano 2024",
    format: "Suizo",
    status: "finished",
    starts_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 75).toISOString(),
    participants: 16,
    challonge_slug: null,
  },
];

// 8-player single-elim bracket for t1
const bracketSeeds = ["p1", "p8", "p4", "p5", "p3", "p6", "p2", "p7"];

const buildBracketMatches = (): Match[] => {
  const out: Match[] = [];
  // QF
  for (let i = 0; i < 4; i++) {
    const a = bracketSeeds[i * 2];
    const b = bracketSeeds[i * 2 + 1];
    const aWins = i % 2 === 0;
    const winner = aWins ? a : b;
    out.push({
      id: `m-qf-${i}`,
      player1_id: a, player2_id: b,
      player1_score: aWins ? 3 : 1,
      player2_score: aWins ? 1 : 3,
      winner_id: winner,
      set_scores: [
        { p1: aWins ? 11 : 7, p2: aWins ? 7 : 11 },
        { p1: aWins ? 11 : 9, p2: aWins ? 9 : 11 },
        { p1: aWins ? 8 : 11, p2: aWins ? 11 : 8 },
        { p1: aWins ? 11 : 6, p2: aWins ? 6 : 11 },
      ],
      round: "Cuartos",
      tournament_id: "t1",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * (24 * 4 - i * 3)).toISOString(),
      match_order: i,
    });
  }
  // SF
  const sfSeeds = [["p1", "p5"], ["p3", "p2"]];
  sfSeeds.forEach(([a, b], i) => {
    const aWins = i === 0;
    out.push({
      id: `m-sf-${i}`,
      player1_id: a, player2_id: b,
      player1_score: aWins ? 3 : 2,
      player2_score: aWins ? 2 : 3,
      winner_id: aWins ? a : b,
      set_scores: [],
      round: "Semifinal",
      tournament_id: "t1",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * (24 * 2 - i * 2)).toISOString(),
      match_order: i,
    });
  });
  // F (pending — no winner yet)
  out.push({
    id: "m-f-0",
    player1_id: "p1", player2_id: "p2",
    player1_score: 0, player2_score: 0,
    winner_id: "",
    set_scores: [],
    round: "Final",
    tournament_id: "t1",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    match_order: 0,
  });
  return out;
};

export const matches: Match[] = buildBracketMatches();

export const recentMatches: Match[] = matches
  .filter(m => m.winner_id)
  .slice(-5)
  .reverse();

export const news: News[] = [
  {
    id: "n1",
    title: "Arranca la Copa Otoño con 8 jugadores",
    excerpt: "Este sábado dio inicio la Copa Otoño con un cuadro de cuartos vibrante.",
    content: "Este sábado dio inicio la Copa Otoño 2025 con un cuadro de 8 jugadores. Los partidos de cuartos dejaron sorpresas y mucho juego rápido.",
    image_url: "https://images.unsplash.com/photo-1611251135345-18c56206b863?w=900&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: "n2",
    title: "Resultado: Lucas Fernández avanza a la final",
    excerpt: "Triunfo en cinco sets cerrados frente a Camila Vega en la semifinal.",
    content: "En una semifinal vibrante, Lucas Fernández se impuso 3-2 a Camila Vega y se metió en la final de la Copa Otoño.",
    image_url: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=900&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "n3",
    title: "Nuevo torneo de apertura confirmado",
    excerpt: "Inscripciones abiertas para el Torneo Apertura Siete Palmas, formato round robin.",
    content: "Ya están abiertas las inscripciones para el Torneo Apertura Siete Palmas, que se jugará en formato round robin con 12 participantes.",
    image_url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "n4",
    title: "Novedad: nuevas mesas para el club",
    excerpt: "Se incorporaron tres mesas profesionales para mejorar el entrenamiento.",
    content: "El club incorporó tres mesas profesionales nuevas que ya están disponibles para entrenamientos y torneos.",
    image_url: "https://images.unsplash.com/photo-1576016770917-9d3a3a013ab2?w=900&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
];

export const playerById = (id: string) => players.find(p => p.id === id);
export const playersById: Record<string, Player> = Object.fromEntries(players.map(p => [p.id, p]));

export const rankedPlayers = () => [...players].sort((a, b) => b.rating - a.rating);

export const playerRank = (id: string) => {
  const sorted = rankedPlayers();
  return sorted.findIndex(p => p.id === id) + 1;
};

export const matchesByTournament = (tid: string) =>
  matches.filter(m => m.tournament_id === tid);
