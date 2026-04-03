from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.game_config import FIXED_CHARACTER_NAMES, FIXED_SEAT_COUNT
from app.db.models import ConstraintType, Difficulty


class PuzzleCharacterBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(min_length=1, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)


class PuzzleCharacterCreate(PuzzleCharacterBase):
    pass


class PuzzleCharacterRead(PuzzleCharacterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    position: int | None = None


class PuzzleConstraintBase(BaseModel):
    type: ConstraintType
    params: dict[str, Any]
    text: str = Field(min_length=1)


class PuzzleConstraintCreate(PuzzleConstraintBase):
    pass


class PuzzleConstraintRead(PuzzleConstraintBase):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    position: int | None = None


class PuzzleDefinitionBase(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str | None = None
    difficulty: Difficulty
    num_characters: int = Field(ge=FIXED_SEAT_COUNT, le=FIXED_SEAT_COUNT)
    characters: list[PuzzleCharacterCreate]
    constraints: list[PuzzleConstraintCreate]
    solution: dict[str, str]

    @model_validator(mode="after")
    def validate_lengths(self) -> "PuzzleDefinitionBase":
        expected_names = set(FIXED_CHARACTER_NAMES)
        if len(self.characters) != self.num_characters:
            raise ValueError("Number of characters must match num_characters")
        if len(self.solution) != self.num_characters:
            raise ValueError("Solution must include exactly one assignment per seat")
        if self.num_characters != FIXED_SEAT_COUNT:
            raise ValueError("This version of the game uses a fixed 10-seat table.")
        names = {character.name for character in self.characters}
        if names != expected_names:
            raise ValueError("Character roster must match the fixed family set.")
        return self


class PuzzleCreate(PuzzleDefinitionBase):
    is_published: bool = False


class PuzzleUpdate(PuzzleDefinitionBase):
    is_published: bool = False


class PuzzlePublicRead(BaseModel):
    id: int
    title: str
    description: str | None
    difficulty: Difficulty
    num_characters: int
    seat_count: int
    characters: list[PuzzleCharacterRead]
    constraints: list[PuzzleConstraintRead]
    is_published: bool
    created_at: datetime


class PuzzleAdminRead(PuzzlePublicRead):
    model_config = ConfigDict(from_attributes=True)

    solution: dict[str, str]
    updated_at: datetime


class PuzzleSummaryRead(BaseModel):
    id: int
    title: str
    difficulty: Difficulty
    num_characters: int
    is_published: bool
    created_at: datetime
    updated_at: datetime


class AttemptValidationRequest(BaseModel):
    placements: dict[str, str]


class AttemptValidationResponse(BaseModel):
    solved: bool
    complete: bool
    violations: list[str]
    placements: dict[str, str]


class HintResponse(BaseModel):
    hint_text: str
    hints_used: int


class PuzzleValidationResponse(BaseModel):
    valid: bool
    unique_solution: bool
    errors: list[str]
    derived_solution: dict[str, str] | None = None
