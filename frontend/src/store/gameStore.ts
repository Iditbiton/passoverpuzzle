import { create } from "zustand";

import type {
  HintResponse,
  LeaderboardEntry,
  Progress,
  PuzzlePublic,
  ValidationResult,
} from "../types/api";

interface GameState {
  puzzle: PuzzlePublic | null;
  progress: Progress | null;
  placements: Record<string, string>;
  leaderboard: LeaderboardEntry[];
  validation: ValidationResult | null;
  hint: HintResponse | null;
  victory: boolean;
  setSession: (payload: {
    puzzle: PuzzlePublic;
    progress: Progress;
    leaderboard: LeaderboardEntry[];
  }) => void;
  setPlacements: (placements: Record<string, string>) => void;
  setValidation: (validation: ValidationResult | null) => void;
  setHint: (hint: HintResponse | null) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  markVictory: (value: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  puzzle: null,
  progress: null,
  placements: {},
  leaderboard: [],
  validation: null,
  hint: null,
  victory: false,

  setSession: ({ puzzle, progress, leaderboard }) =>
    set({
      puzzle,
      progress,
      placements: progress.placements,
      leaderboard,
      hint: null,
      validation: null,
      victory: progress.is_completed,
    }),

  setPlacements: (placements) => set({ placements }),
  setValidation: (validation) => set({ validation, victory: validation?.solved ?? false }),
  setHint: (hint) => set({ hint }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  markVictory: (victory) => set({ victory }),
  reset: () =>
    set({
      puzzle: null,
      progress: null,
      placements: {},
      leaderboard: [],
      validation: null,
      hint: null,
      victory: false,
    }),
}));

