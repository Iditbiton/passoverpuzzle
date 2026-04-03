from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.db.models import Puzzle, User
from app.schemas.puzzle import (
    PuzzleAdminRead,
    PuzzleCreate,
    PuzzleSummaryRead,
    PuzzleUpdate,
    PuzzleValidationResponse,
)
from app.services.puzzle_engine import validate_puzzle_definition
from app.services.puzzle_service import (
    hydrate_puzzle_model,
    puzzle_to_admin_schema,
    puzzle_to_definition,
    puzzle_to_summary_schema,
)
router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_puzzle_query(db: Session):
    return db.query(Puzzle).options(
        joinedload(Puzzle.characters),
        joinedload(Puzzle.constraints),
        joinedload(Puzzle.solution_entries),
    )


def _run_definition_validation(payload: PuzzleCreate) -> PuzzleValidationResponse:
    definition = payload.model_dump()
    errors, solutions = validate_puzzle_definition(definition)
    return PuzzleValidationResponse(
        valid=not errors,
        unique_solution=len(solutions) == 1,
        errors=errors,
        derived_solution=solutions[0] if len(solutions) == 1 else None,
    )


def _ensure_publish_uniqueness(db: Session, puzzle: Puzzle) -> None:
    if not puzzle.is_published:
        return
    (
        db.query(Puzzle)
        .filter(
            Puzzle.id != puzzle.id,
            Puzzle.difficulty == puzzle.difficulty,
            Puzzle.is_published.is_(True),
        )
        .update(
            {
                Puzzle.is_published: False,
                Puzzle.published_at: None,
            },
            synchronize_session=False,
        )
    )
    puzzle.published_at = datetime.now(UTC)


@router.get("/puzzles", response_model=list[PuzzleSummaryRead])
def list_puzzles(
    db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
) -> list[PuzzleSummaryRead]:
    del admin
    puzzles = db.query(Puzzle).order_by(Puzzle.updated_at.desc()).all()
    return [puzzle_to_summary_schema(puzzle) for puzzle in puzzles]


@router.get("/puzzles/{puzzle_id}", response_model=PuzzleAdminRead)
def get_puzzle(
    puzzle_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PuzzleAdminRead:
    del admin
    puzzle = _admin_puzzle_query(db).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")
    return puzzle_to_admin_schema(puzzle)


@router.post("/puzzles/validate", response_model=PuzzleValidationResponse)
def validate_puzzle(
    payload: PuzzleCreate,
    admin: User = Depends(get_current_admin),
) -> PuzzleValidationResponse:
    del admin
    return _run_definition_validation(payload)


@router.post("/puzzles", response_model=PuzzleAdminRead, status_code=status.HTTP_201_CREATED)
def create_puzzle(
    payload: PuzzleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PuzzleAdminRead:
    validation = _run_definition_validation(payload)
    if not validation.valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.errors)

    puzzle = hydrate_puzzle_model(db, payload, admin)
    _ensure_publish_uniqueness(db, puzzle)
    db.commit()
    db.refresh(puzzle)
    return puzzle_to_admin_schema(
        _admin_puzzle_query(db).filter(Puzzle.id == puzzle.id).first()
    )


@router.put("/puzzles/{puzzle_id}", response_model=PuzzleAdminRead)
def update_puzzle(
    puzzle_id: int,
    payload: PuzzleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PuzzleAdminRead:
    puzzle = _admin_puzzle_query(db).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")

    validation = _run_definition_validation(PuzzleCreate(**payload.model_dump()))
    if not validation.valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.errors)

    hydrate_puzzle_model(db, PuzzleCreate(**payload.model_dump()), admin, puzzle=puzzle)
    _ensure_publish_uniqueness(db, puzzle)
    db.commit()
    db.refresh(puzzle)
    return puzzle_to_admin_schema(
        _admin_puzzle_query(db).filter(Puzzle.id == puzzle.id).first()
    )


@router.delete("/puzzles/{puzzle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_puzzle(
    puzzle_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> None:
    del admin
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")
    db.delete(puzzle)
    db.commit()


@router.post("/puzzles/{puzzle_id}/publish", response_model=PuzzleAdminRead)
def publish_puzzle(
    puzzle_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PuzzleAdminRead:
    del admin
    puzzle = _admin_puzzle_query(db).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")
    puzzle.is_published = True
    _ensure_publish_uniqueness(db, puzzle)
    db.commit()
    db.refresh(puzzle)
    return puzzle_to_admin_schema(puzzle)


@router.post("/puzzles/{puzzle_id}/unpublish", response_model=PuzzleAdminRead)
def unpublish_puzzle(
    puzzle_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PuzzleAdminRead:
    del admin
    puzzle = _admin_puzzle_query(db).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found.")
    puzzle.is_published = False
    puzzle.published_at = None
    db.commit()
    db.refresh(puzzle)
    return puzzle_to_admin_schema(puzzle)

