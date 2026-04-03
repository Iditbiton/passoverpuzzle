import { create } from "zustand";

import type {
  PuzzleAdmin,
  PuzzleDraftPayload,
  PuzzleSummary,
  PuzzleValidationResponse,
} from "../types/api";
import { createEmptyDraft, draftFromPuzzle } from "../utils/puzzle";

interface AdminState {
  puzzles: PuzzleSummary[];
  selectedPuzzleId: number | null;
  draft: PuzzleDraftPayload;
  loadedPuzzle: PuzzleAdmin | null;
  validation: PuzzleValidationResponse | null;
  setPuzzles: (puzzles: PuzzleSummary[]) => void;
  selectPuzzle: (puzzle: PuzzleAdmin | null) => void;
  setDraft: (draft: PuzzleDraftPayload) => void;
  patchDraft: (patch: Partial<PuzzleDraftPayload>) => void;
  setValidation: (validation: PuzzleValidationResponse | null) => void;
  createNewDraft: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  puzzles: [],
  selectedPuzzleId: null,
  draft: createEmptyDraft(),
  loadedPuzzle: null,
  validation: null,

  setPuzzles: (puzzles) => set({ puzzles }),
  selectPuzzle: (puzzle) =>
    set({
      selectedPuzzleId: puzzle?.id ?? null,
      loadedPuzzle: puzzle,
      draft: puzzle ? draftFromPuzzle(puzzle) : createEmptyDraft(),
      validation: null,
    }),
  setDraft: (draft) => set({ draft }),
  patchDraft: (patch) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...patch,
      },
    })),
  setValidation: (validation) => set({ validation }),
  createNewDraft: () =>
    set({
      selectedPuzzleId: null,
      loadedPuzzle: null,
      draft: createEmptyDraft(),
      validation: null,
    }),
}));

