import type {
  ConstraintType,
  Difficulty,
  PuzzleAdmin,
  PuzzleConstraint,
  PuzzleDraftPayload,
  PuzzlePublic,
} from "../types/api";

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

export const difficultyDescriptions: Record<Difficulty, string> = {
  easy: "12 רמזים שמובילים אתכם בהדרגה לסידור המלא",
  medium: "10 רמזים שדורשים כבר הצלבה בין כמה הנחות",
  hard: "8 רמזים בלבד, בלי שרשרת פשוטה של צעד-אחר-צעד",
};

export const constraintTypeLabels: Record<ConstraintType, string> = {
  adjacent: "סמוך",
  not_adjacent: "לא סמוך",
  left: "משמאל",
  right: "מימין",
  opposite: "מול",
  between: "בין",
  zone: "אזור",
};

export const zoneLabels: Record<string, string> = {
  north: "צפון",
  east: "מזרח",
  south: "דרום",
  west: "מערב",
};

export const FIXED_SEAT_COUNT = 10;

export const FIXED_CHARACTER_ROSTER = [
  { name: "אבא", role: "אחראי על הקידוש", image_url: "/characters/dad.png" },
  { name: "אמא", role: "מארגנת את קערת הסדר", image_url: "/characters/mom.png" },
  { name: "דוד", role: "מביא את החרוסת", image_url: "/characters/uncle.png" },
  { name: "דודה", role: "מגישה את המצות", image_url: "/characters/aunt.png" },
  { name: "סבא", role: "מקריא מההגדה", image_url: "/characters/grandpa.png" },
  { name: "סבתא", role: "שומרת על האפיקומן", image_url: "/characters/grandma.png" },
  { name: "ילד", role: "שואל את הקושיות", image_url: "/characters/boy.png" },
  { name: "ילדה", role: "מחלקת קישוטים", image_url: "/characters/girl.png" },
  { name: "כלב", role: "מחכה לפירורים", image_url: "/characters/dog.png" },
  { name: "חתול", role: "משקיף על הכוסות", image_url: "/characters/cat.png" },
] as const;

export function seatLabels(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `seat_${index + 1}`);
}

export function seatNumber(seatLabel: string): number {
  return Number(seatLabel.replace("seat_", ""));
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} שניות`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")} דקות`;
}

function buildFixedCharacters() {
  return FIXED_CHARACTER_ROSTER.map((character, index) => ({
    ...character,
    position: index,
  }));
}

export function createEmptyDraft(difficulty: Difficulty = "easy"): PuzzleDraftPayload {
  return {
    title: "",
    description: "",
    difficulty,
    num_characters: FIXED_SEAT_COUNT,
    characters: buildFixedCharacters(),
    constraints: [],
    solution: Object.fromEntries(
      seatLabels(FIXED_SEAT_COUNT).map((seat) => [seat, ""]),
    ),
    is_published: false,
  };
}

export function draftFromPuzzle(puzzle: PuzzleAdmin): PuzzleDraftPayload {
  const characterMap = new Map(
    puzzle.characters.map((character) => [character.name, character] as const),
  );

  return {
    title: puzzle.title,
    description: puzzle.description,
    difficulty: puzzle.difficulty,
    num_characters: FIXED_SEAT_COUNT,
    characters: FIXED_CHARACTER_ROSTER.map((character, index) => ({
      name: character.name,
      role: characterMap.get(character.name)?.role ?? character.role,
      image_url: characterMap.get(character.name)?.image_url ?? character.image_url,
      position: index,
    })),
    constraints: puzzle.constraints.map((constraint) => ({
      type: constraint.type,
      params: { ...constraint.params },
      text: constraint.text,
    })),
    solution: { ...puzzle.solution },
    is_published: puzzle.is_published,
  };
}

export function sanitizeDraft(draft: PuzzleDraftPayload): PuzzleDraftPayload {
  const trimmedCharacters = draft.characters.map((character) => ({
    ...character,
    name: character.name.trim(),
    role: character.role.trim(),
    image_url: character.image_url?.trim() ?? "",
  }));
  const trimmedConstraints = draft.constraints.map((constraint) => ({
    ...constraint,
    text: constraint.text.trim(),
    params: Object.fromEntries(
      Object.entries(constraint.params).map(([key, value]) => [key, value.trim()]),
    ),
  }));
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description?.trim() ?? "",
    characters: trimmedCharacters,
    constraints: trimmedConstraints,
    solution: Object.fromEntries(
      Object.entries(draft.solution).map(([seat, value]) => [seat, value.trim()]),
    ),
  };
}

export function getConstraintFields(type: ConstraintType): string[] {
  switch (type) {
    case "between":
      return ["characterA", "leftCharacter", "rightCharacter"];
    case "zone":
      return ["character", "zone"];
    default:
      return ["characterA", "characterB"];
  }
}

export function displayConstraintParam(key: string): string {
  const labels: Record<string, string> = {
    character: "דמות",
    characterA: "דמות א׳",
    characterB: "דמות ב׳",
    leftCharacter: "דמות משמאל",
    rightCharacter: "דמות מימין",
    zone: "אזור",
  };
  return labels[key] ?? key;
}

export function buildReadOnlyPuzzleFromDraft(draft: PuzzleDraftPayload): PuzzlePublic {
  return {
    id: 0,
    title: draft.title || "תצוגה מקדימה",
    description: draft.description,
    difficulty: draft.difficulty,
    num_characters: FIXED_SEAT_COUNT,
    seat_count: FIXED_SEAT_COUNT,
    characters: draft.characters,
    constraints: draft.constraints as PuzzleConstraint[],
    is_published: draft.is_published,
    created_at: new Date().toISOString(),
  };
}
