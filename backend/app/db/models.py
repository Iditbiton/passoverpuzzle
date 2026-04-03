from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import JSON, Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer
from sqlalchemy import String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ConstraintType(str, Enum):
    ADJACENT = "adjacent"
    NOT_ADJACENT = "not_adjacent"
    LEFT = "left"
    RIGHT = "right"
    OPPOSITE = "opposite"
    BETWEEN = "between"
    ZONE = "zone"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    progresses: Mapped[list["PlayerProgress"]] = relationship(back_populates="user")
    leaderboard_entries: Mapped[list["LeaderboardEntry"]] = relationship(
        back_populates="user"
    )
    created_puzzles: Mapped[list["Puzzle"]] = relationship(back_populates="creator")


class Puzzle(TimestampMixin, Base):
    __tablename__ = "puzzles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[Difficulty] = mapped_column(
        SqlEnum(Difficulty, name="difficulty_enum"), index=True
    )
    num_characters: Mapped[int] = mapped_column(Integer, nullable=False)
    seat_count: Mapped[int] = mapped_column(Integer, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    creator: Mapped[User | None] = relationship(back_populates="created_puzzles")
    characters: Mapped[list["PuzzleCharacter"]] = relationship(
        back_populates="puzzle",
        cascade="all, delete-orphan",
        order_by="PuzzleCharacter.position",
    )
    constraints: Mapped[list["PuzzleConstraint"]] = relationship(
        back_populates="puzzle",
        cascade="all, delete-orphan",
        order_by="PuzzleConstraint.position",
    )
    solution_entries: Mapped[list["PuzzleSolution"]] = relationship(
        back_populates="puzzle",
        cascade="all, delete-orphan",
        order_by="PuzzleSolution.position",
    )
    progresses: Mapped[list["PlayerProgress"]] = relationship(back_populates="puzzle")
    leaderboard_entries: Mapped[list["LeaderboardEntry"]] = relationship(
        back_populates="puzzle"
    )


class PuzzleCharacter(Base):
    __tablename__ = "puzzle_characters"
    __table_args__ = (UniqueConstraint("puzzle_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(String(120), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    puzzle: Mapped[Puzzle] = relationship(back_populates="characters")


class PuzzleConstraint(Base):
    __tablename__ = "puzzle_constraints"

    id: Mapped[int] = mapped_column(primary_key=True)
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"))
    type: Mapped[ConstraintType] = mapped_column(
        SqlEnum(ConstraintType, name="constraint_type_enum")
    )
    params: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    puzzle: Mapped[Puzzle] = relationship(back_populates="constraints")


class PuzzleSolution(Base):
    __tablename__ = "puzzle_solutions"
    __table_args__ = (UniqueConstraint("puzzle_id", "seat_label"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"))
    seat_label: Mapped[str] = mapped_column(String(40), nullable=False)
    character_name: Mapped[str] = mapped_column(String(80), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    puzzle: Mapped[Puzzle] = relationship(back_populates="solution_entries")


class PlayerProgress(TimestampMixin, Base):
    __tablename__ = "player_progress"
    __table_args__ = (UniqueConstraint("user_id", "puzzle_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"))
    placements: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    hints_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship(back_populates="progresses")
    puzzle: Mapped[Puzzle] = relationship(back_populates="progresses")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"
    __table_args__ = (UniqueConstraint("user_id", "puzzle_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"))
    elapsed_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    hints_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    solved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="leaderboard_entries")
    puzzle: Mapped[Puzzle] = relationship(back_populates="leaderboard_entries")
