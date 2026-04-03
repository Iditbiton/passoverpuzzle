from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.db.models import Difficulty, LeaderboardEntry, PlayerProgress, Puzzle, User
from app.schemas.progress import LeaderboardEntryRead, ProgressRead, ProgressUpdateRequest
from app.schemas.puzzle import (
    AttemptValidationRequest,
    AttemptValidationResponse,
    HintResponse,
    PuzzlePublicRead,
)
from app.services.puzzle_engine import next_hint, validate_player_attempt
from app.services.puzzle_service import (
    ensure_progress,
    leaderboard_to_schema,
    progress_to_schema,
    puzzle_to_definition,
    puzzle_to_public_schema,
    upsert_leaderboard_entry,
)


router = APIRouter(prefix="/player", tags=["player"])


def _published_puzzle_query(db: Session):
    return (
        db.query(Puzzle)
        .options(
            joinedload(Puzzle.characters),
            joinedload(Puzzle.constraints),
            joinedload(Puzzle.solution_entries),
        )
        .filter(Puzzle.is_published.is_(True))
    )


@router.get("/puzzles/active", response_model=list[PuzzlePublicRead])
def list_active_puzzles(
    difficulty: Difficulty | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PuzzlePublicRead]:
    del user
    query = _published_puzzle_query(db)
    if difficulty is not None:
        query = query.filter(Puzzle.difficulty == difficulty)
    puzzles = query.order_by(Puzzle.difficulty.asc(), Puzzle.created_at.asc()).all()
    return [puzzle_to_public_schema(puzzle) for puzzle in puzzles]


@router.get("/puzzles/active/{difficulty}", response_model=PuzzlePublicRead)
def get_active_puzzle(
    difficulty: Difficulty,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PuzzlePublicRead:
    del user
    puzzle = (
        _published_puzzle_query(db)
        .filter(Puzzle.difficulty == difficulty)
        .order_by(Puzzle.published_at.desc().nullslast(), Puzzle.created_at.desc())
        .first()
    )
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active puzzle.")
    return puzzle_to_public_schema(puzzle)


@router.get("/progress/{puzzle_id}", response_model=ProgressRead)
def get_progress(
    puzzle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProgressRead:
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id, Puzzle.is_published.is_(True)).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")
    progress = ensure_progress(db, user, puzzle)
    db.commit()
    db.refresh(progress)
    return progress_to_schema(progress)


@router.put("/progress/{puzzle_id}", response_model=ProgressRead)
def save_progress(
    puzzle_id: int,
    payload: ProgressUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProgressRead:
    puzzle = (
        db.query(Puzzle)
        .options(joinedload(Puzzle.characters), joinedload(Puzzle.solution_entries), joinedload(Puzzle.constraints))
        .filter(Puzzle.id == puzzle_id, Puzzle.is_published.is_(True))
        .first()
    )
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")

    definition = puzzle_to_definition(puzzle)
    violations, _ = validate_player_attempt(definition, payload.placements)
    if any("לא חוקיים" in violation or "אי אפשר" in violation for violation in violations):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=violations[0])

    progress = ensure_progress(db, user, puzzle)
    progress.placements = payload.placements
    db.commit()
    db.refresh(progress)
    return progress_to_schema(progress)


@router.post("/puzzles/{puzzle_id}/validate", response_model=AttemptValidationResponse)
def validate_attempt(
    puzzle_id: int,
    payload: AttemptValidationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AttemptValidationResponse:
    puzzle = (
        db.query(Puzzle)
        .options(joinedload(Puzzle.characters), joinedload(Puzzle.constraints), joinedload(Puzzle.solution_entries))
        .filter(Puzzle.id == puzzle_id, Puzzle.is_published.is_(True))
        .first()
    )
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")

    definition = puzzle_to_definition(puzzle)
    violations, complete = validate_player_attempt(definition, payload.placements)
    solved = complete and not violations

    progress = ensure_progress(db, user, puzzle)
    progress.placements = payload.placements
    if solved and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = datetime.now(UTC)
        upsert_leaderboard_entry(db, user, puzzle, progress)
    db.commit()

    return AttemptValidationResponse(
        solved=solved,
        complete=complete,
        violations=violations,
        placements=payload.placements,
    )


@router.post("/puzzles/{puzzle_id}/hint", response_model=HintResponse)
def request_hint(
    puzzle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HintResponse:
    puzzle = (
        db.query(Puzzle)
        .options(joinedload(Puzzle.characters), joinedload(Puzzle.constraints), joinedload(Puzzle.solution_entries))
        .filter(Puzzle.id == puzzle_id, Puzzle.is_published.is_(True))
        .first()
    )
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")

    progress = ensure_progress(db, user, puzzle)
    progress.hints_used += 1
    hint_text = next_hint(puzzle_to_definition(puzzle), progress.placements)
    db.commit()
    return HintResponse(hint_text=hint_text, hints_used=progress.hints_used)


@router.get("/puzzles/{puzzle_id}/leaderboard", response_model=list[LeaderboardEntryRead])
def get_leaderboard(
    puzzle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeaderboardEntryRead]:
    del user
    entries = (
        db.query(LeaderboardEntry)
        .options(joinedload(LeaderboardEntry.user))
        .filter(LeaderboardEntry.puzzle_id == puzzle_id)
        .order_by(LeaderboardEntry.elapsed_seconds.asc(), LeaderboardEntry.hints_used.asc())
        .limit(20)
        .all()
    )
    return leaderboard_to_schema(entries)

