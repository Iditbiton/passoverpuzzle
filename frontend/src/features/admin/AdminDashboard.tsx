import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { apiRequest, ApiError } from "../../api/client";
import { Field } from "../../components/Field";
import { SederBoard } from "../game/SederBoard";
import { useAdminStore } from "../../store/adminStore";
import type {
  ConstraintType,
  Difficulty,
  PuzzleAdmin,
  PuzzleConstraint,
  PuzzleSummary,
  PuzzleValidationResponse,
} from "../../types/api";
import {
  FIXED_CHARACTER_ROSTER,
  FIXED_SEAT_COUNT,
  buildReadOnlyPuzzleFromDraft,
  constraintTypeLabels,
  createEmptyDraft,
  difficultyLabels,
  displayConstraintParam,
  getConstraintFields,
  sanitizeDraft,
  zoneLabels,
} from "../../utils/puzzle";

const difficultyOptions: Difficulty[] = ["easy", "medium", "hard"];
const constraintTypes: ConstraintType[] = [
  "adjacent",
  "not_adjacent",
  "left",
  "right",
  "opposite",
  "between",
  "zone",
];

export function AdminDashboard() {
  const {
    puzzles,
    selectedPuzzleId,
    draft,
    validation,
    setPuzzles,
    selectPuzzle,
    setDraft,
    patchDraft,
    setValidation,
    createNewDraft,
  } = useAdminStore();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    void refreshList();
  }, []);

  const filteredPuzzles = useMemo(() => {
    return puzzles.filter((puzzle) =>
      `${puzzle.title} ${difficultyLabels[puzzle.difficulty]}`
        .toLowerCase()
        .includes(deferredSearch.toLowerCase()),
    );
  }, [puzzles, deferredSearch]);

  async function refreshList() {
    try {
      const response = await apiRequest<PuzzleSummary[]>("/admin/puzzles");
      setPuzzles(response);
      if (!selectedPuzzleId && response[0]) {
        await loadPuzzle(response[0].id);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לטעון את רשימת החידות.",
      );
    }
  }

  async function loadPuzzle(id: number) {
    setError(null);
    try {
      const response = await apiRequest<PuzzleAdmin>(`/admin/puzzles/${id}`);
      selectPuzzle(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לטעון את החידה שבחרת.",
      );
    }
  }

  function updateCharacter(index: number, field: "role" | "image_url", value: string) {
    const nextCharacters = [...draft.characters];
    nextCharacters[index] = { ...nextCharacters[index], [field]: value };
    setDraft({ ...draft, characters: nextCharacters });
  }

  function addConstraint() {
    setDraft({
      ...draft,
      constraints: [
        ...draft.constraints,
        {
          type: "adjacent",
          params: { characterA: "", characterB: "" },
          text: "",
        },
      ],
    });
  }

  function updateConstraint(index: number, nextConstraint: PuzzleConstraint) {
    const nextConstraints = [...draft.constraints];
    nextConstraints[index] = nextConstraint;
    setDraft({ ...draft, constraints: nextConstraints });
  }

  function removeConstraint(index: number) {
    setDraft({
      ...draft,
      constraints: draft.constraints.filter((_, currentIndex) => currentIndex !== index),
    });
  }

  async function validateDraft() {
    setError(null);
    setStatusMessage(null);
    try {
      const response = await apiRequest<PuzzleValidationResponse>("/admin/puzzles/validate", {
        method: "POST",
        body: JSON.stringify(sanitizeDraft(draft)),
      });
      startTransition(() => setValidation(response));
      setStatusMessage(response.valid ? "הטיוטה תקינה ומוכנה לשמירה." : null);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "הבדיקה נכשלה כרגע.",
      );
    }
  }

  async function saveDraft() {
    setError(null);
    setStatusMessage(null);
    try {
      const payload = sanitizeDraft(draft);
      if (selectedPuzzleId) {
        await apiRequest<PuzzleAdmin>(`/admin/puzzles/${selectedPuzzleId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiRequest<PuzzleAdmin>("/admin/puzzles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        selectPuzzle(created);
      }
      await refreshList();
      if (selectedPuzzleId) {
        await loadPuzzle(selectedPuzzleId);
      }
      setStatusMessage("החידה נשמרה בהצלחה.");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לשמור את החידה.",
      );
    }
  }

  async function togglePublish(nextValue: boolean) {
    if (!selectedPuzzleId) {
      return;
    }
    setError(null);
    try {
      const path = nextValue
        ? `/admin/puzzles/${selectedPuzzleId}/publish`
        : `/admin/puzzles/${selectedPuzzleId}/unpublish`;
      const response = await apiRequest<PuzzleAdmin>(path, { method: "POST" });
      selectPuzzle(response);
      await refreshList();
      setStatusMessage(nextValue ? "החידה פורסמה בהצלחה." : "החידה הוסרה מפרסום.");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לעדכן את סטטוס הפרסום.",
      );
    }
  }

  async function removePuzzle() {
    if (!selectedPuzzleId || !window.confirm("למחוק את החידה הזו?")) {
      return;
    }
    try {
      await apiRequest<void>(`/admin/puzzles/${selectedPuzzleId}`, { method: "DELETE" });
      createNewDraft();
      await refreshList();
      setStatusMessage("החידה נמחקה.");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו למחוק את החידה.",
      );
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-wine/70">
            אזור ניהול
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            יצירה, בדיקה ופרסום של חידות פסח
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-secondary" onClick={() => {
            createNewDraft();
            setDraft(createEmptyDraft(draft.difficulty));
          }}>
            חידה חדשה
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <aside className="soft-panel p-5">
          <div className="mb-4">
            <Field label="חיפוש חידות">
              <input
                className="field-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חפשו לפי שם או רמה"
              />
            </Field>
          </div>

          <div className="space-y-3">
            {filteredPuzzles.map((puzzle) => (
              <button
                key={puzzle.id}
                type="button"
                onClick={() => void loadPuzzle(puzzle.id)}
                className={`w-full rounded-[1.5rem] border px-4 py-4 text-right transition ${
                  selectedPuzzleId === puzzle.id
                    ? "border-wine bg-wine/8"
                    : "border-white/70 bg-white/60 hover:bg-white/80"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{puzzle.title}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      puzzle.is_published
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {puzzle.is_published ? "פעילה" : "טיוטה"}
                  </span>
                </div>
                <p className="text-sm text-ink/62">
                  {difficultyLabels[puzzle.difficulty]} · {puzzle.num_characters} דמויות
                </p>
              </button>
            ))}
            {filteredPuzzles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-wine/20 px-4 py-6 text-sm text-ink/55">
                לא נמצאו חידות שתואמות לחיפוש.
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="soft-panel p-6">
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <Field label="שם החידה">
                <input
                  className="field-input"
                  value={draft.title}
                  onChange={(event) => patchDraft({ title: event.target.value })}
                  placeholder="למשל: מי יושב ליד קערת הסדר"
                />
              </Field>
              <Field label="רמת קושי">
                <select
                  className="field-input"
                  value={draft.difficulty}
                  onChange={(event) =>
                    patchDraft({ difficulty: event.target.value as Difficulty })
                  }
                >
                  {difficultyOptions.map((option) => (
                    <option key={option} value={option}>
                      {difficultyLabels[option]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-[0.4fr_1fr]">
              <Field
                label="מבנה החידה"
                hint="הרוסטר קבוע: אבא, אמא, דוד, דודה, סבא, סבתא, ילד, ילדה, כלב, חתול"
              >
                <div className="rounded-[1.4rem] border border-white/70 bg-white/70 px-4 py-4 text-sm leading-7 text-ink/70">
                  <p className="font-bold text-ink">{FIXED_SEAT_COUNT} דמויות קבועות סביב השולחן</p>
                  <p className="mt-2">
                    רמת הקושי נקבעת לפי כמות הרמזים והאיכות שלהם, לא לפי מספר המשתתפים.
                  </p>
                </div>
              </Field>
              <Field label="תיאור">
                <textarea
                  className="field-input min-h-[110px] resize-y"
                  value={draft.description ?? ""}
                  onChange={(event) => patchDraft({ description: event.target.value })}
                  placeholder="תיאור קצר לשחקנים"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-primary" onClick={saveDraft}>
                {selectedPuzzleId ? "שמירת שינויים" : "יצירת חידה"}
              </button>
              <button type="button" className="button-secondary" onClick={validateDraft}>
                בדיקת validator
              </button>
              {selectedPuzzleId ? (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void togglePublish(!draft.is_published)}
                  >
                    {draft.is_published ? "הסר מפרסום" : "פרסם כחידה פעילה"}
                  </button>
                  <button type="button" className="button-ghost" onClick={removePuzzle}>
                    מחיקה
                  </button>
                </>
              ) : null}
            </div>
          </section>

          <section className="soft-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">דמויות ופתרון</h2>
                <p className="text-sm text-ink/60">
                  שמות הדמויות קבועים. אפשר לעדכן תפקיד, תמונה והצבה בפתרון.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {draft.characters.map((character, index) => {
                const seat = `seat_${index + 1}`;
                return (
                  <div
                    key={seat}
                    className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4 md:grid-cols-2 xl:grid-cols-4"
                  >
                    <Field label={`דמות ${index + 1}`}>
                      <div className="flex h-full items-center rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-3 text-base font-bold text-ink">
                        {FIXED_CHARACTER_ROSTER[index]?.name ?? character.name}
                      </div>
                    </Field>
                    <Field label="תפקיד">
                      <input
                        className="field-input"
                        value={character.role}
                        onChange={(event) => updateCharacter(index, "role", event.target.value)}
                        placeholder="למשל: מקריא ההגדה"
                      />
                    </Field>
                    <Field
                      label="תמונה"
                      hint="אפשר URL מלא או נתיב כמו /characters/miriam.png"
                    >
                      <input
                        className="field-input"
                        value={character.image_url ?? ""}
                        onChange={(event) =>
                          updateCharacter(index, "image_url", event.target.value)
                        }
                        placeholder="/characters/example.png"
                      />
                    </Field>
                    <Field label={`כיסא ${index + 1}`}>
                      <select
                        className="field-input"
                        value={draft.solution[seat] ?? ""}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            solution: { ...draft.solution, [seat]: event.target.value },
                          })
                        }
                      >
                        <option value="">בחרו דמות</option>
                        {draft.characters.map((option, optionIndex) => (
                          <option
                            key={`${option.name}-${optionIndex}`}
                            value={option.name}
                          >
                            {option.name || `דמות ${optionIndex + 1}`}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="soft-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">רמזים / אילוצים</h2>
                <p className="text-sm text-ink/60">
                  המנוע תומך ב-adjacent, not_adjacent, left, right, opposite, between ו-zone.
                  לחידה קשה עדיף מעט רמזים חוצים, לא שרשרת ישירה של שכנים.
                </p>
              </div>
              <button type="button" className="button-secondary" onClick={addConstraint}>
                הוסף אילוץ
              </button>
            </div>

            <div className="space-y-4">
              {draft.constraints.map((constraint, index) => {
                const fields = getConstraintFields(constraint.type);
                return (
                  <div
                    key={`${constraint.type}-${index}`}
                    className="rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
                  >
                    <div className="mb-4 grid gap-4 md:grid-cols-[0.3fr_0.7fr]">
                      <Field label="סוג אילוץ">
                        <select
                          className="field-input"
                          value={constraint.type}
                          onChange={(event) => {
                            const nextType = event.target.value as ConstraintType;
                            const nextParams = Object.fromEntries(
                              getConstraintFields(nextType).map((field) => [field, ""]),
                            );
                            updateConstraint(index, {
                              ...constraint,
                              type: nextType,
                              params: nextParams,
                            });
                          }}
                        >
                          {constraintTypes.map((type) => (
                            <option key={type} value={type}>
                              {constraintTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="טקסט לשחקן">
                        <input
                          className="field-input"
                          value={constraint.text}
                          onChange={(event) =>
                            updateConstraint(index, {
                              ...constraint,
                              text: event.target.value,
                            })
                          }
                          placeholder="ניסוח ברור בעברית"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {fields.map((field) => (
                        <Field key={field} label={displayConstraintParam(field)}>
                          {field === "zone" ? (
                            <select
                              className="field-input"
                              value={constraint.params[field] ?? ""}
                              onChange={(event) =>
                                updateConstraint(index, {
                                  ...constraint,
                                  params: {
                                    ...constraint.params,
                                    [field]: event.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">בחרו אזור</option>
                              {Object.entries(zoneLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="field-input"
                              value={constraint.params[field] ?? ""}
                              onChange={(event) =>
                                updateConstraint(index, {
                                  ...constraint,
                                  params: {
                                    ...constraint.params,
                                    [field]: event.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">בחרו דמות</option>
                              {draft.characters.map((character, characterIndex) => (
                                <option
                                  key={`${character.name}-${characterIndex}`}
                                  value={character.name}
                                >
                                  {character.name || `דמות ${characterIndex + 1}`}
                                </option>
                              ))}
                            </select>
                          )}
                        </Field>
                      ))}
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        className="button-ghost"
                        onClick={() => removeConstraint(index)}
                      >
                        מחק אילוץ
                      </button>
                    </div>
                  </div>
                );
              })}
              {draft.constraints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-wine/20 px-4 py-6 text-sm text-ink/55">
                  עדיין לא נוספו אילוצים. אפשר להוסיף אותם ידנית כאן.
                </div>
              ) : null}
            </div>
          </section>

          <section className="soft-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">Preview</h2>
                <p className="text-sm text-ink/60">
                  תצוגה מקדימה של מבנה החידה והפתרון שנשמר בטופס.
                </p>
              </div>
              {isPending ? <span className="text-sm text-ink/55">מעדכן...</span> : null}
            </div>

            <SederBoard
              seatCount={draft.num_characters}
              characters={buildReadOnlyPuzzleFromDraft(draft).characters}
              placements={draft.solution}
              readOnly
            />

            {validation ? (
              <div
                className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${
                  validation.valid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p className="font-bold">
                  {validation.valid ? "הטיוטה תקינה" : "הטיוטה דורשת תיקון"}
                </p>
                <p className="mt-2">
                  {validation.unique_solution
                    ? "קיים פתרון יחיד דטרמיניסטי."
                    : "עדיין אין ודאות לפתרון יחיד."}
                </p>
                {validation.errors.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {validation.errors.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
