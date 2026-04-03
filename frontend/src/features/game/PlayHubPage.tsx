import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, ApiError } from "../../api/client";
import type { PuzzlePublic } from "../../types/api";
import {
  difficultyDescriptions,
  difficultyLabels,
} from "../../utils/puzzle";

export function PlayHubPage() {
  const [puzzles, setPuzzles] = useState<PuzzlePublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPuzzles();
  }, []);

  async function loadPuzzles() {
    try {
      const response = await apiRequest<PuzzlePublic[]>("/player/puzzles/active");
      setPuzzles(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "לא הצלחנו לטעון את החידות כרגע.",
      );
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-wine/70">
            אזור שחקנים
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            בוחרים רמת קושי ונכנסים ישר לשולחן
          </h1>
        </div>
        <p className="max-w-2xl text-base leading-8 text-ink/70">
          לכל רמת קושי אפשר לפרסם חידה פעילה אחת. ההתקדמות האישית נשמרת, והרמזים
          נרשמים בדירוג רק אם ביקשתם אותם בלחיצה.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {(["easy", "medium", "hard"] as const).map((difficulty) => {
          const activePuzzle = puzzles.find((puzzle) => puzzle.difficulty === difficulty);
          return (
            <article
              key={difficulty}
              className="soft-panel overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-2 inline-flex rounded-full bg-parchment px-3 py-1 text-xs font-bold text-wine">
                    רמה {difficultyLabels[difficulty]}
                  </p>
                  <h2 className="text-2xl font-bold text-ink">
                    {activePuzzle?.title ?? `אין חידה פעילה`}
                  </h2>
                </div>
                <div className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-bold text-wine">
                  {activePuzzle
                    ? `${activePuzzle.num_characters} דמויות · ${activePuzzle.constraints.length} רמזים`
                    : "אין חידה"}
                </div>
              </div>

              <p className="mb-8 text-sm leading-7 text-ink/70">
                {activePuzzle?.description ?? difficultyDescriptions[difficulty]}
              </p>

              {activePuzzle ? (
                <Link className="button-primary w-full" to={`/play/${difficulty}`}>
                  פותחים את החידה
                </Link>
              ) : (
                <div className="rounded-2xl border border-dashed border-wine/20 px-4 py-5 text-sm text-ink/50">
                  האדמין עדיין לא פרסם חידה פעילה לרמה הזו.
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
