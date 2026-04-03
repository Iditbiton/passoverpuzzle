from sqlalchemy.orm import Session, joinedload

from app.core.game_config import FIXED_CHARACTER_ROSTER
from app.core.security import get_password_hash
from app.db.models import Difficulty, LeaderboardEntry, PlayerProgress, Puzzle, User
from app.schemas.puzzle import PuzzleCreate
from app.services.puzzle_engine import validate_puzzle_definition
from app.services.puzzle_service import hydrate_puzzle_model, puzzle_to_definition


SAMPLE_PUZZLES = [
    PuzzleCreate(
        title="סדר פסח קליל למשפחה",
        description="חידת פתיחה עם 12 רמזים שמאפשרים להיכנס מהר למשחק, אבל עדיין דורשים הצלבה בין בני המשפחה והחיות.",
        difficulty=Difficulty.EASY,
        num_characters=10,
        characters=FIXED_CHARACTER_ROSTER,
        constraints=[
            {
                "type": "zone",
                "params": {"character": "אבא", "zone": "north"},
                "text": "אבא יושב בצד הצפוני של השולחן.",
            },
            {
                "type": "zone",
                "params": {"character": "דודה", "zone": "north"},
                "text": "דודה יושבת גם היא בצד הצפוני של השולחן.",
            },
            {
                "type": "left",
                "params": {"characterA": "דודה", "characterB": "אבא"},
                "text": "דודה יושבת משמאל לאבא.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "חתול",
                    "leftCharacter": "אבא",
                    "rightCharacter": "ילדה",
                },
                "text": "החתול יושב בין אבא לילדה.",
            },
            {
                "type": "left",
                "params": {"characterA": "ילדה", "characterB": "אמא"},
                "text": "הילדה יושבת משמאל לאמא.",
            },
            {
                "type": "zone",
                "params": {"character": "אמא", "zone": "east"},
                "text": "אמא יושבת בצד המזרחי של השולחן.",
            },
            {
                "type": "opposite",
                "params": {"characterA": "דוד", "characterB": "אבא"},
                "text": "דוד יושב מול אבא.",
            },
            {
                "type": "right",
                "params": {"characterA": "כלב", "characterB": "דוד"},
                "text": "הכלב יושב מימין לדוד.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "ילד",
                    "leftCharacter": "כלב",
                    "rightCharacter": "סבא",
                },
                "text": "הילד יושב בין הכלב לסבא.",
            },
            {
                "type": "zone",
                "params": {"character": "סבא", "zone": "west"},
                "text": "סבא יושב בצד המערבי של השולחן.",
            },
            {
                "type": "opposite",
                "params": {"characterA": "דודה", "characterB": "סבתא"},
                "text": "דודה יושבת מול סבתא.",
            },
            {
                "type": "not_adjacent",
                "params": {"characterA": "חתול", "characterB": "דוד"},
                "text": "החתול לא יושב ליד דוד.",
            },
        ],
        solution={
            "seat_1": "אבא",
            "seat_2": "חתול",
            "seat_3": "ילדה",
            "seat_4": "אמא",
            "seat_5": "סבתא",
            "seat_6": "דוד",
            "seat_7": "כלב",
            "seat_8": "ילד",
            "seat_9": "סבא",
            "seat_10": "דודה",
        },
        is_published=True,
    ),
    PuzzleCreate(
        title="מי יושב ליד קערת הסדר",
        description="חידה בינונית עם 10 רמזים בלבד. צריך לשלב כיוונים, מרחקים ושלילה כדי למצוא את הסידור היחיד.",
        difficulty=Difficulty.MEDIUM,
        num_characters=10,
        characters=FIXED_CHARACTER_ROSTER,
        constraints=[
            {
                "type": "zone",
                "params": {"character": "דודה", "zone": "north"},
                "text": "דודה יושבת גם היא בצד הצפוני של השולחן.",
            },
            {
                "type": "left",
                "params": {"characterA": "דודה", "characterB": "אבא"},
                "text": "דודה יושבת משמאל לאבא.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "חתול",
                    "leftCharacter": "אבא",
                    "rightCharacter": "ילדה",
                },
                "text": "החתול יושב בין אבא לילדה.",
            },
            {
                "type": "zone",
                "params": {"character": "אמא", "zone": "east"},
                "text": "אמא יושבת בצד המזרחי של השולחן.",
            },
            {
                "type": "opposite",
                "params": {"characterA": "דוד", "characterB": "אבא"},
                "text": "דוד יושב מול אבא.",
            },
            {
                "type": "right",
                "params": {"characterA": "כלב", "characterB": "דוד"},
                "text": "הכלב יושב מימין לדוד.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "ילד",
                    "leftCharacter": "כלב",
                    "rightCharacter": "סבא",
                },
                "text": "הילד יושב בין הכלב לסבא.",
            },
            {
                "type": "opposite",
                "params": {"characterA": "דודה", "characterB": "סבתא"},
                "text": "דודה יושבת מול סבתא.",
            },
            {
                "type": "not_adjacent",
                "params": {"characterA": "חתול", "characterB": "דוד"},
                "text": "החתול לא יושב ליד דוד.",
            },
            {
                "type": "not_adjacent",
                "params": {"characterA": "אמא", "characterB": "סבא"},
                "text": "אמא לא יושבת ליד סבא.",
            },
        ],
        solution={
            "seat_1": "אבא",
            "seat_2": "חתול",
            "seat_3": "ילדה",
            "seat_4": "אמא",
            "seat_5": "סבתא",
            "seat_6": "דוד",
            "seat_7": "כלב",
            "seat_8": "ילד",
            "seat_9": "סבא",
            "seat_10": "דודה",
        },
        is_published=True,
    ),
    PuzzleCreate(
        title="מסדרים את שולחן החג הגדול",
        description="חידת אתגר עם 8 רמזים בלבד. אי אפשר להתקדם בה צעד־צעד בלי הצלבה בין כמה אילוצים במקביל.",
        difficulty=Difficulty.HARD,
        num_characters=10,
        characters=FIXED_CHARACTER_ROSTER,
        constraints=[
            {
                "type": "zone",
                "params": {"character": "דודה", "zone": "north"},
                "text": "דודה יושבת גם היא בצד הצפוני של השולחן.",
            },
            {
                "type": "left",
                "params": {"characterA": "דודה", "characterB": "אבא"},
                "text": "דודה יושבת משמאל לאבא.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "חתול",
                    "leftCharacter": "אבא",
                    "rightCharacter": "ילדה",
                },
                "text": "החתול יושב בין אבא לילדה.",
            },
            {
                "type": "zone",
                "params": {"character": "אמא", "zone": "east"},
                "text": "אמא יושבת בצד המזרחי של השולחן.",
            },
            {
                "type": "right",
                "params": {"characterA": "כלב", "characterB": "דוד"},
                "text": "הכלב יושב מימין לדוד.",
            },
            {
                "type": "between",
                "params": {
                    "characterA": "ילד",
                    "leftCharacter": "כלב",
                    "rightCharacter": "סבא",
                },
                "text": "הילד יושב בין הכלב לסבא.",
            },
            {
                "type": "opposite",
                "params": {"characterA": "דודה", "characterB": "סבתא"},
                "text": "דודה יושבת מול סבתא.",
            },
            {
                "type": "not_adjacent",
                "params": {"characterA": "חתול", "characterB": "דוד"},
                "text": "החתול לא יושב ליד דוד.",
            },
        ],
        solution={
            "seat_1": "אבא",
            "seat_2": "חתול",
            "seat_3": "ילדה",
            "seat_4": "אמא",
            "seat_5": "סבתא",
            "seat_6": "דוד",
            "seat_7": "כלב",
            "seat_8": "ילד",
            "seat_9": "סבא",
            "seat_10": "דודה",
        },
        is_published=True,
    ),
]


def seed_initial_data(db: Session, admin_username: str, admin_password: str) -> None:
    admin = db.query(User).filter(User.username == admin_username).first()
    if admin is None:
        admin = User(
            username=admin_username,
            password_hash=get_password_hash(admin_password),
            is_admin=True,
        )
        db.add(admin)
        db.flush()

    existing_puzzles = (
        db.query(Puzzle)
        .options(
            joinedload(Puzzle.characters),
            joinedload(Puzzle.constraints),
            joinedload(Puzzle.solution_entries),
        )
        .filter(Puzzle.title.in_([payload.title for payload in SAMPLE_PUZZLES]))
        .all()
    )
    puzzles_by_title = {puzzle.title: puzzle for puzzle in existing_puzzles}

    for payload in SAMPLE_PUZZLES:
        payload_data = payload.model_dump(mode="python")
        errors, _ = validate_puzzle_definition(payload_data)
        if errors:
            raise RuntimeError(
                f"Seed puzzle '{payload.title}' is invalid: {', '.join(errors)}"
            )

        existing = puzzles_by_title.get(payload.title)
        if existing is None:
            hydrate_puzzle_model(db, payload, admin)
            continue

        existing_definition = puzzle_to_definition(existing)
        current_data = {
            "title": existing.title,
            "description": existing.description,
            "difficulty": existing.difficulty,
            "num_characters": existing.num_characters,
            "characters": existing_definition["characters"],
            "constraints": existing_definition["constraints"],
            "solution": existing_definition["solution"],
            "is_published": existing.is_published,
        }

        if current_data == payload_data:
            continue

        db.query(PlayerProgress).filter(PlayerProgress.puzzle_id == existing.id).delete(
            synchronize_session=False
        )
        db.query(LeaderboardEntry).filter(
            LeaderboardEntry.puzzle_id == existing.id
        ).delete(synchronize_session=False)
        hydrate_puzzle_model(db, payload, admin, puzzle=existing)

    db.commit()
