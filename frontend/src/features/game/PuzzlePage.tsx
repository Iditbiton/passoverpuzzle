import { useEffect, useRef, useState, useTransition } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest, ApiError } from "../../api/client";
import { SederBoard } from "./SederBoard";
import { useGameStore } from "../../store/gameStore";
import type {
  HintResponse,
  LeaderboardEntry,
  Progress,
  PuzzlePublic,
  ValidationResult,
} from "../../types/api";
import {
  difficultyLabels,
  formatDuration,
} from "../../utils/puzzle";

export function PuzzlePage() {
  const { difficulty } = useParams();
  const {
    puzzle,
    placements,
    leaderboard,
    validation,
    hint,
    victory,
    setSession,
    setPlacements,
    setValidation,
    setHint,
    setLeaderboard,
    reset,
  } = useGameStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<string>("מוכן");
  const [isPending, startTransition] = useTransition();
  const initializedRef = useRef(false);

  useEffect(() => {
    void loadPuzzle();
    return () => reset();
  }, [difficulty]);

  useEffect(() => {
    if (!puzzle || !initializedRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void saveProgress();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [placements, puzzle?.id]);

  async function loadPuzzle() {
    if (!difficulty) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const activePuzzle = await apiRequest<PuzzlePublic>(`/player/puzzles/active/${difficulty}`);
      const [progress, nextLeaderboard] = await Promise.all([
        apiRequest<Progress>(`/player/progress/${activePuzzle.id}`),
        apiRequest<LeaderboardEntry[]>(`/player/puzzles/${activePuzzle.id}/leaderboard`),
      ]);
      initializedRef.current = true;
      setSession({ puzzle: activePuzzle, progress, leaderboard: nextLeaderboard });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לטעון את החידה שביקשת.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProgress() {
    if (!puzzle) {
      return;
    }
    try {
      setSaveState("שומר...");
      await apiRequest<Progress>(`/player/progress/${puzzle.id}`, {
        method: "PUT",
        body: JSON.stringify({ placements }),
      });
      setSaveState("נשמר");
    } catch {
      setSaveState("שמירה נכשלה");
    }
  }

  async function validateBoard() {
    if (!puzzle) {
      return;
    }
    setError(null);
    try {
      const response = await apiRequest<ValidationResult>(
        `/player/puzzles/${puzzle.id}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ placements }),
        },
      );
      startTransition(() => setValidation(response));
      if (response.solved) {
        const nextLeaderboard = await apiRequest<LeaderboardEntry[]>(
          `/player/puzzles/${puzzle.id}/leaderboard`,
        );
        setLeaderboard(nextLeaderboard);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לבדוק את הלוח כרגע.",
      );
    }
  }

  async function requestHint() {
    if (!puzzle) {
      return;
    }
    try {
      const response = await apiRequest<HintResponse>(`/player/puzzles/${puzzle.id}/hint`, {
        method: "POST",
      });
      setHint(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לייצר רמז כרגע.",
      );
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-ink/70">
        טוען את שולחן החג...
      </div>
    );
  }

  if (error && !puzzle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="mb-4 text-lg text-red-700">{error}</div>
        <Link to="/play" className="button-secondary">
          חזרה לבחירת רמה
        </Link>
      </div>
    );
  }

  if (!puzzle) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/play" className="mb-3 inline-flex text-sm font-bold text-wine">
            חזרה לבחירת רמה
          </Link>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-wine/70">
            רמה {difficultyLabels[puzzle.difficulty]}
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">{puzzle.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-ink/70">
            {puzzle.description}
          </p>
        </div>
        <div className="soft-panel flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-ink/70">
          <span>{puzzle.num_characters} דמויות</span>
          <span className="h-1 w-1 rounded-full bg-wine/40" />
          <span>{puzzle.constraints.length} רמזים</span>
          <span className="h-1 w-1 rounded-full bg-wine/40" />
          <span>{saveState}</span>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {victory ? (
        <div className="mb-6 rounded-[2rem] border border-gold/40 bg-gradient-to-l from-gold/15 to-white/90 px-6 py-5 shadow-glow">
          <p className="mb-2 font-display text-3xl text-wine">ניצחון!</p>
          <p className="text-base leading-8 text-ink/75">
            סידרתם את כל המשתתפים נכון סביב השולחן. התוצאה נשמרה בלידרבורד.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        <SederBoard
          seatCount={puzzle.seat_count}
          characters={puzzle.characters}
          constraints={puzzle.constraints}
          placements={placements}
          onChange={setPlacements}
        />

        <section className="soft-panel p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">פעולות ורמזים</h2>
              <p className="text-sm text-ink/60">
                קודם מסדרים, אחר כך בודקים. אם נתקעים, מבקשים רמז בלחיצה.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:min-w-[360px]">
              <button
                type="button"
                className="button-primary flex-1"
                onClick={validateBoard}
                disabled={isPending}
              >
                {isPending ? "בודק..." : "בדוק פתרון"}
              </button>
              <button type="button" className="button-secondary flex-1" onClick={requestHint}>
                בקש רמז
              </button>
            </div>
          </div>

          {validation ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                validation.solved
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {validation.solved
                ? "הפתרון נכון. כל הכיסאות הושלמו בהצלחה."
                : validation.violations.length > 0
                  ? validation.violations.join(" | ")
                  : validation.complete
                    ? "כל המקומות מלאים, אבל עדיין יש משהו לסדר."
                    : "עדיין חסרות הצבות לפני שאפשר לנצח."}
            </div>
          ) : null}

          {hint ? (
            <div className="mt-4 rounded-2xl border border-wine/15 bg-wine/5 px-4 py-3 text-sm text-ink/80">
              <p className="font-bold text-wine">רמז נחשף</p>
              <p className="mt-1 leading-7">{hint.hint_text}</p>
              <p className="mt-2 text-xs text-ink/55">
                סך הכל רמזים שנצרכו: {hint.hints_used}
              </p>
            </div>
          ) : null}
        </section>

        <section className="soft-panel p-6 xl:hidden">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-ink">רמזי החידה</h2>
            <p className="text-sm text-ink/60">
              במובייל הרמזים נשארים כאן. ב־desktop הם צמודים ישירות לדמויות שבצדדים.
            </p>
          </div>
          <ol className="grid gap-3 md:grid-cols-2">
            {puzzle.constraints.map((constraint, index) => (
              <li
                key={`${constraint.text}-${index}`}
                className="rounded-2xl border border-white/70 bg-parchment/45 px-4 py-3 text-sm leading-7 text-ink/78"
              >
                <span className="ml-2 font-bold text-wine">{index + 1}.</span>
                {constraint.text}
              </li>
            ))}
          </ol>
        </section>

        <section className="soft-panel p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-ink">לידרבורד</h2>
            <p className="text-sm text-ink/60">הדירוג נקבע לפי זמן פתרון ורמזים.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {leaderboard.map((entry, index) => (
              <div
                key={`${entry.username}-${entry.solved_at}`}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-ink">
                    {index + 1}. {entry.username}
                  </p>
                  <p className="text-xs text-ink/55">רמזים: {entry.hints_used}</p>
                </div>
                <p className="font-bold text-wine">
                  {formatDuration(entry.elapsed_seconds)}
                </p>
              </div>
            ))}
            {leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-wine/20 px-4 py-6 text-sm text-ink/55 md:col-span-2">
                עדיין אין פותרים מדורגים לחידה הזו.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
