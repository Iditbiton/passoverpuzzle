from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    LeaderboardEntry,
    PlayerProgress,
    Puzzle,
    PuzzleCharacter,
    PuzzleConstraint,
    PuzzleSolution,
    User,
)
from app.schemas.progress import LeaderboardEntryRead, ProgressRead
from app.schemas.puzzle import PuzzleAdminRead, PuzzleCreate, PuzzlePublicRead, PuzzleSummaryRead
from app.services.puzzle_engine import seat_index


def sort_solution_items(solution: dict[str, str]) -> list[tuple[str, str]]:
    return sorted(solution.items(), key=lambda item: seat_index(item[0]))


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def puzzle_to_definition(puzzle: Puzzle) -> dict[str, Any]:
    return {
        "title": puzzle.title,
        "description": puzzle.description,
        "difficulty": puzzle.difficulty,
        "num_characters": puzzle.num_characters,
        "characters": [
            {
                "name": character.name,
                "role": character.role,
                "image_url": character.image_url,
            }
            for character in puzzle.characters
        ],
        "constraints": [
            {
                "type": constraint.type,
                "params": constraint.params,
                "text": constraint.text,
            }
            for constraint in puzzle.constraints
        ],
        "solution": {entry.seat_label: entry.character_name for entry in puzzle.solution_entries},
    }


def puzzle_to_public_schema(puzzle: Puzzle) -> PuzzlePublicRead:
    definition = puzzle_to_definition(puzzle)
    return PuzzlePublicRead(
        id=puzzle.id,
        title=puzzle.title,
        description=puzzle.description,
        difficulty=puzzle.difficulty,
        num_characters=puzzle.num_characters,
        seat_count=puzzle.seat_count,
        characters=definition["characters"],
        constraints=definition["constraints"],
        is_published=puzzle.is_published,
        created_at=puzzle.created_at,
    )


def puzzle_to_admin_schema(puzzle: Puzzle) -> PuzzleAdminRead:
    definition = puzzle_to_definition(puzzle)
    return PuzzleAdminRead(
        id=puzzle.id,
        title=puzzle.title,
        description=puzzle.description,
        difficulty=puzzle.difficulty,
        num_characters=puzzle.num_characters,
        seat_count=puzzle.seat_count,
        characters=definition["characters"],
        constraints=definition["constraints"],
        solution=definition["solution"],
        is_published=puzzle.is_published,
        created_at=puzzle.created_at,
        updated_at=puzzle.updated_at,
    )


def puzzle_to_summary_schema(puzzle: Puzzle) -> PuzzleSummaryRead:
    return PuzzleSummaryRead(
        id=puzzle.id,
        title=puzzle.title,
        difficulty=puzzle.difficulty,
        num_characters=puzzle.num_characters,
        is_published=puzzle.is_published,
        created_at=puzzle.created_at,
        updated_at=puzzle.updated_at,
    )


def hydrate_puzzle_model(
    db: Session, payload: PuzzleCreate, current_user: User, puzzle: Puzzle | None = None
) -> Puzzle:
    if puzzle is None:
        puzzle = Puzzle(created_by_id=current_user.id)
        db.add(puzzle)

    puzzle.title = payload.title
    puzzle.description = payload.description
    puzzle.difficulty = payload.difficulty
    puzzle.num_characters = payload.num_characters
    puzzle.seat_count = payload.num_characters
    puzzle.ai_generated = False
    puzzle.is_published = payload.is_published
    puzzle.published_at = datetime.now(UTC) if payload.is_published else None

    has_existing_children = bool(
        puzzle.characters or puzzle.constraints or puzzle.solution_entries
    )
    puzzle.characters.clear()
    puzzle.constraints.clear()
    puzzle.solution_entries.clear()

    if has_existing_children:
        db.flush()

    for index, character in enumerate(payload.characters):
        puzzle.characters.append(
            PuzzleCharacter(
                name=character.name,
                role=character.role,
                image_url=character.image_url,
                position=index,
            )
        )

    for index, constraint in enumerate(payload.constraints):
        puzzle.constraints.append(
            PuzzleConstraint(
                type=constraint.type,
                params=constraint.params,
                text=constraint.text,
                position=index,
            )
        )

    for index, (seat_label, character_name) in enumerate(sort_solution_items(payload.solution)):
        puzzle.solution_entries.append(
            PuzzleSolution(
                seat_label=seat_label,
                character_name=character_name,
                position=index,
            )
        )

    db.flush()
    return puzzle


def ensure_progress(db: Session, user: User, puzzle: Puzzle) -> PlayerProgress:
    progress = (
        db.query(PlayerProgress)
        .filter(PlayerProgress.user_id == user.id, PlayerProgress.puzzle_id == puzzle.id)
        .first()
    )
    if progress is None:
        progress = PlayerProgress(user_id=user.id, puzzle_id=puzzle.id, placements={})
        db.add(progress)
        db.flush()
    return progress


def progress_to_schema(progress: PlayerProgress) -> ProgressRead:
    return ProgressRead(
        puzzle_id=progress.puzzle_id,
        placements=progress.placements,
        hints_used=progress.hints_used,
        is_completed=progress.is_completed,
        started_at=progress.started_at,
        completed_at=progress.completed_at,
    )


def upsert_leaderboard_entry(
    db: Session, user: User, puzzle: Puzzle, progress: PlayerProgress
) -> None:
    if progress.completed_at is None:
        return

    started_at = normalize_datetime(progress.started_at)
    completed_at = normalize_datetime(progress.completed_at)
    elapsed_seconds = max(
        1, int((completed_at - started_at).total_seconds())
    )
    existing = (
        db.query(LeaderboardEntry)
        .filter(
            LeaderboardEntry.user_id == user.id,
            LeaderboardEntry.puzzle_id == puzzle.id,
        )
        .first()
    )
    if existing is None:
        db.add(
            LeaderboardEntry(
                user_id=user.id,
                puzzle_id=puzzle.id,
                elapsed_seconds=elapsed_seconds,
                hints_used=progress.hints_used,
                solved_at=progress.completed_at,
            )
        )
        return

    improved = (
        elapsed_seconds < existing.elapsed_seconds
        or (
            elapsed_seconds == existing.elapsed_seconds
            and progress.hints_used < existing.hints_used
        )
    )
    if improved:
        existing.elapsed_seconds = elapsed_seconds
        existing.hints_used = progress.hints_used
        existing.solved_at = progress.completed_at


def leaderboard_to_schema(entries: list[LeaderboardEntry]) -> list[LeaderboardEntryRead]:
    return [
        LeaderboardEntryRead(
            username=entry.user.username,
            elapsed_seconds=entry.elapsed_seconds,
            hints_used=entry.hints_used,
            solved_at=entry.solved_at,
        )
        for entry in entries
    ]
