export type Difficulty = "easy" | "medium" | "hard";

export type ConstraintType =
  | "adjacent"
  | "not_adjacent"
  | "left"
  | "right"
  | "opposite"
  | "between"
  | "zone";

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PuzzleCharacter {
  id?: number | null;
  position?: number | null;
  name: string;
  role: string;
  image_url?: string | null;
}

export interface PuzzleConstraint {
  id?: number | null;
  position?: number | null;
  type: ConstraintType;
  params: Record<string, string>;
  text: string;
}

export interface PuzzlePublic {
  id: number;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  num_characters: number;
  seat_count: number;
  characters: PuzzleCharacter[];
  constraints: PuzzleConstraint[];
  is_published: boolean;
  created_at: string;
}

export interface PuzzleAdmin extends PuzzlePublic {
  solution: Record<string, string>;
  updated_at: string;
}

export interface PuzzleSummary {
  id: number;
  title: string;
  difficulty: Difficulty;
  num_characters: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  puzzle_id: number;
  placements: Record<string, string>;
  hints_used: number;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface ValidationResult {
  solved: boolean;
  complete: boolean;
  violations: string[];
  placements: Record<string, string>;
}

export interface HintResponse {
  hint_text: string;
  hints_used: number;
}

export interface LeaderboardEntry {
  username: string;
  elapsed_seconds: number;
  hints_used: number;
  solved_at: string;
}

export interface PuzzleValidationResponse {
  valid: boolean;
  unique_solution: boolean;
  errors: string[];
  derived_solution: Record<string, string> | null;
}

export interface PuzzleDraftPayload {
  title: string;
  description: string | null;
  difficulty: Difficulty;
  num_characters: number;
  characters: PuzzleCharacter[];
  constraints: PuzzleConstraint[];
  solution: Record<string, string>;
  is_published: boolean;
}
