from datetime import datetime

from pydantic import BaseModel


class ProgressUpdateRequest(BaseModel):
    placements: dict[str, str]


class ProgressRead(BaseModel):
    puzzle_id: int
    placements: dict[str, str]
    hints_used: int
    is_completed: bool
    started_at: datetime
    completed_at: datetime | None


class LeaderboardEntryRead(BaseModel):
    username: str
    elapsed_seconds: int
    hints_used: int
    solved_at: datetime

