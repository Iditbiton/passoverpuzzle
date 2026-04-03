from __future__ import annotations

from typing import Any

from app.db.models import ConstraintType


class PuzzleValidationError(Exception):
    pass


def seat_labels(seat_count: int) -> list[str]:
    return [f"seat_{index}" for index in range(1, seat_count + 1)]


def seat_index(seat_label: str) -> int:
    try:
        return int(seat_label.split("_")[1]) - 1
    except (IndexError, ValueError) as exc:
        raise PuzzleValidationError(f"Invalid seat label: {seat_label}") from exc


def seat_zone(index: int, seat_count: int) -> str:
    angle = (index / seat_count) * 360
    if angle >= 315 or angle < 45:
        return "north"
    if angle < 135:
        return "east"
    if angle < 225:
        return "south"
    return "west"


def referenced_characters(constraint: dict[str, Any]) -> list[str]:
    params = constraint.get("params", {})
    names: list[str] = []
    for key in ("character", "characterA", "characterB", "leftCharacter", "rightCharacter"):
        value = params.get(key)
        if isinstance(value, str):
            names.append(value)
    return names


def invert_solution(solution: dict[str, str]) -> dict[str, str]:
    return {character: seat for seat, character in solution.items()}


def is_adjacent(a: int, b: int, seat_count: int) -> bool:
    return (a - b) % seat_count in {1, seat_count - 1}


def is_left_of(a: int, b: int, seat_count: int) -> bool:
    return a == (b - 1) % seat_count


def is_right_of(a: int, b: int, seat_count: int) -> bool:
    return a == (b + 1) % seat_count


def is_opposite(a: int, b: int, seat_count: int) -> bool:
    if seat_count % 2 != 0:
        return False
    return a == (b + seat_count // 2) % seat_count


def is_between(target: int, left_index: int, right_index: int, seat_count: int) -> bool:
    return {
        (target - 1) % seat_count,
        (target + 1) % seat_count,
    } == {left_index, right_index}


def evaluate_constraint(
    constraint: dict[str, Any], solution_map: dict[str, str], seat_count: int
) -> bool:
    character_to_seat = invert_solution(solution_map)
    params = constraint.get("params", {})
    constraint_type = constraint["type"]

    def get_index(character_key: str) -> int:
        character_name = params.get(character_key)
        seat = character_to_seat[character_name]
        return seat_index(seat)

    if constraint_type == ConstraintType.ADJACENT:
        return is_adjacent(get_index("characterA"), get_index("characterB"), seat_count)
    if constraint_type == ConstraintType.NOT_ADJACENT:
        return not is_adjacent(
            get_index("characterA"), get_index("characterB"), seat_count
        )
    if constraint_type == ConstraintType.LEFT:
        return is_left_of(get_index("characterA"), get_index("characterB"), seat_count)
    if constraint_type == ConstraintType.RIGHT:
        return is_right_of(get_index("characterA"), get_index("characterB"), seat_count)
    if constraint_type == ConstraintType.OPPOSITE:
        return is_opposite(get_index("characterA"), get_index("characterB"), seat_count)
    if constraint_type == ConstraintType.BETWEEN:
        return is_between(
            get_index("characterA"),
            get_index("leftCharacter"),
            get_index("rightCharacter"),
            seat_count,
        )
    if constraint_type == ConstraintType.ZONE:
        return seat_zone(get_index("character"), seat_count) == params.get("zone")
    raise PuzzleValidationError(f"Unsupported constraint type: {constraint_type}")


def validate_definition_structure(definition: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    num_characters = definition["num_characters"]
    characters = definition["characters"]
    constraints = definition["constraints"]
    solution = definition["solution"]
    expected_seats = seat_labels(num_characters)
    names = [character["name"] for character in characters]

    if len(set(names)) != len(names):
        errors.append("Character names must be unique.")
    if set(solution.keys()) != set(expected_seats):
        errors.append("Solution must contain a contiguous seat map.")
    if set(solution.values()) != set(names):
        errors.append("Solution must assign each character exactly once.")

    valid_zones = {"north", "east", "south", "west"}
    for constraint in constraints:
        for name in referenced_characters(constraint):
            if name not in names:
                errors.append(f"Constraint references an unknown character: {name}")
        if constraint["type"] == ConstraintType.ZONE and constraint["params"].get(
            "zone"
        ) not in valid_zones:
            errors.append("Zone constraint must use north/east/south/west.")
        if constraint["type"] == ConstraintType.OPPOSITE and num_characters % 2 != 0:
            errors.append("Opposite constraints require an even number of seats.")
    return errors


def neighbors(index: int, seat_count: int) -> set[int]:
    return {(index - 1) % seat_count, (index + 1) % seat_count}


def valid_zone_seats(zone: str, seat_count: int) -> set[int]:
    return {
        index for index in range(seat_count) if seat_zone(index, seat_count) == zone
    }


def _binary_target_seats(
    constraint_type: ConstraintType | str, anchor_index: int, seat_count: int
) -> set[int]:
    if constraint_type == ConstraintType.ADJACENT:
        return neighbors(anchor_index, seat_count)
    if constraint_type == ConstraintType.NOT_ADJACENT:
        return set(range(seat_count)) - neighbors(anchor_index, seat_count)
    if constraint_type == ConstraintType.LEFT:
        return {(anchor_index - 1) % seat_count}
    if constraint_type == ConstraintType.RIGHT:
        return {(anchor_index + 1) % seat_count}
    if constraint_type == ConstraintType.OPPOSITE:
        if seat_count % 2 != 0:
            return set()
        return {(anchor_index + seat_count // 2) % seat_count}
    return set(range(seat_count))


def partial_constraint_possible(
    constraint: dict[str, Any],
    char_to_index: dict[str, int],
    available_indices: set[int],
    seat_count: int,
) -> bool:
    params = constraint.get("params", {})
    constraint_type = constraint["type"]

    def assigned(name_key: str) -> int | None:
        character_name = params.get(name_key)
        if not isinstance(character_name, str):
            return None
        return char_to_index.get(character_name)

    if constraint_type == ConstraintType.ZONE:
        current_index = assigned("character")
        zone = params.get("zone")
        allowed = valid_zone_seats(zone, seat_count)
        if current_index is not None:
            return current_index in allowed
        return bool(allowed & available_indices)

    if constraint_type in {
        ConstraintType.ADJACENT,
        ConstraintType.NOT_ADJACENT,
        ConstraintType.LEFT,
        ConstraintType.RIGHT,
        ConstraintType.OPPOSITE,
    }:
        a_index = assigned("characterA")
        b_index = assigned("characterB")
        if a_index is not None and b_index is not None:
            return evaluate_constraint(
                constraint,
                {f"seat_{index + 1}": character for character, index in char_to_index.items()},
                seat_count,
            )
        if a_index is not None and b_index is None:
            target_type = constraint_type
            if constraint_type == ConstraintType.LEFT:
                target_type = ConstraintType.RIGHT
            elif constraint_type == ConstraintType.RIGHT:
                target_type = ConstraintType.LEFT
            return bool(
                _binary_target_seats(target_type, a_index, seat_count) & available_indices
            )
        if b_index is not None and a_index is None:
            return bool(
                _binary_target_seats(constraint_type, b_index, seat_count) & available_indices
            )
        return True

    if constraint_type == ConstraintType.BETWEEN:
        target_index = assigned("characterA")
        left_index = assigned("leftCharacter")
        right_index = assigned("rightCharacter")

        if (
            target_index is not None
            and left_index is not None
            and right_index is not None
        ):
            return is_between(target_index, left_index, right_index, seat_count)

        if left_index is not None and right_index is not None:
            candidate_targets = {
                index
                for index in available_indices
                if is_between(index, left_index, right_index, seat_count)
            }
            if target_index is not None:
                return target_index in {
                    index
                    for index in range(seat_count)
                    if is_between(index, left_index, right_index, seat_count)
                }
            return bool(candidate_targets)

        if target_index is not None and left_index is not None:
            needed = neighbors(target_index, seat_count) - {left_index}
            if right_index is not None:
                return right_index in needed
            return bool(needed & available_indices)

        if target_index is not None and right_index is not None:
            needed = neighbors(target_index, seat_count) - {right_index}
            if left_index is not None:
                return left_index in needed
            return bool(needed & available_indices)

        return True

    raise PuzzleValidationError(f"Unsupported constraint type: {constraint_type}")


def candidate_seats_for_character(
    definition: dict[str, Any],
    character_name: str,
    char_to_index: dict[str, int],
    available_indices: set[int],
) -> set[int]:
    seat_count = definition["num_characters"]
    candidate_indices = set(available_indices)

    for constraint in definition["constraints"]:
        params = constraint.get("params", {})
        constraint_type = constraint["type"]

        if constraint_type == ConstraintType.ZONE and params.get("character") == character_name:
            candidate_indices &= valid_zone_seats(params.get("zone"), seat_count)
            continue

        if constraint_type in {
            ConstraintType.ADJACENT,
            ConstraintType.NOT_ADJACENT,
            ConstraintType.LEFT,
            ConstraintType.RIGHT,
            ConstraintType.OPPOSITE,
        }:
            a_name = params.get("characterA")
            b_name = params.get("characterB")
            if a_name == character_name and b_name in char_to_index:
                if constraint_type == ConstraintType.LEFT:
                    candidate_indices &= _binary_target_seats(
                        ConstraintType.LEFT, char_to_index[b_name], seat_count
                    )
                elif constraint_type == ConstraintType.RIGHT:
                    candidate_indices &= _binary_target_seats(
                        ConstraintType.RIGHT, char_to_index[b_name], seat_count
                    )
                else:
                    candidate_indices &= _binary_target_seats(
                        constraint_type, char_to_index[b_name], seat_count
                    )
            elif b_name == character_name and a_name in char_to_index:
                inverse_type = constraint_type
                if constraint_type == ConstraintType.LEFT:
                    inverse_type = ConstraintType.RIGHT
                elif constraint_type == ConstraintType.RIGHT:
                    inverse_type = ConstraintType.LEFT
                candidate_indices &= _binary_target_seats(
                    inverse_type, char_to_index[a_name], seat_count
                )
            continue

        if constraint_type == ConstraintType.BETWEEN:
            target_name = params.get("characterA")
            left_name = params.get("leftCharacter")
            right_name = params.get("rightCharacter")
            target_index = char_to_index.get(target_name)
            left_index = char_to_index.get(left_name)
            right_index = char_to_index.get(right_name)

            if target_name == character_name and left_index is not None and right_index is not None:
                candidate_indices &= {
                    index
                    for index in available_indices
                    if is_between(index, left_index, right_index, seat_count)
                }
            elif left_name == character_name and target_index is not None:
                candidate_indices &= neighbors(target_index, seat_count)
                if right_index is not None:
                    candidate_indices &= {index for index in available_indices if index != right_index}
            elif right_name == character_name and target_index is not None:
                candidate_indices &= neighbors(target_index, seat_count)
                if left_index is not None:
                    candidate_indices &= {index for index in available_indices if index != left_index}

    return candidate_indices


def solve_puzzle(definition: dict[str, Any], max_solutions: int = 2) -> list[dict[str, str]]:
    names = [character["name"] for character in definition["characters"]]
    seat_count = definition["num_characters"]
    solutions: list[dict[str, str]] = []
    available_indices = set(range(seat_count))
    char_to_index: dict[str, int] = {}

    def backtrack() -> None:
        if len(solutions) >= max_solutions:
            return
        if len(char_to_index) == len(names):
            seat_map = {
                f"seat_{index + 1}": character
                for character, index in char_to_index.items()
            }
            if all(
                evaluate_constraint(constraint, seat_map, seat_count)
                for constraint in definition["constraints"]
            ):
                ordered_map = {
                    f"seat_{index + 1}": seat_map[f"seat_{index + 1}"]
                    for index in range(seat_count)
                }
                solutions.append(ordered_map)
            return

        remaining_characters = [name for name in names if name not in char_to_index]
        candidates_by_character = {
            name: candidate_seats_for_character(
                definition, name, char_to_index, available_indices
            )
            for name in remaining_characters
        }
        next_character = min(
            remaining_characters,
            key=lambda name: (len(candidates_by_character[name]), names.index(name)),
        )
        candidate_indices = candidates_by_character[next_character]

        if not candidate_indices:
            return

        for index in sorted(candidate_indices):
            char_to_index[next_character] = index
            available_indices.remove(index)

            if all(
                partial_constraint_possible(
                    constraint,
                    char_to_index,
                    available_indices,
                    seat_count,
                )
                for constraint in definition["constraints"]
            ):
                backtrack()

            available_indices.add(index)
            del char_to_index[next_character]

    backtrack()

    return solutions


def validate_puzzle_definition(definition: dict[str, Any]) -> tuple[list[str], list[dict[str, str]]]:
    errors = validate_definition_structure(definition)
    if errors:
        return errors, []

    try:
        if not all(
            evaluate_constraint(
                constraint, definition["solution"], definition["num_characters"]
            )
            for constraint in definition["constraints"]
        ):
            errors.append("Provided solution does not satisfy all constraints.")
    except (KeyError, PuzzleValidationError) as exc:
        errors.append(str(exc))
        return errors, []

    solutions = solve_puzzle(definition)
    if not solutions:
        errors.append("Puzzle is not solvable.")
    elif len(solutions) > 1:
        errors.append("Puzzle must have a unique solution.")
    elif solutions[0] != definition["solution"]:
        errors.append("Provided solution does not match the unique derived solution.")
    return errors, solutions


def validate_player_attempt(
    definition: dict[str, Any], placements: dict[str, str]
) -> tuple[list[str], bool]:
    violations: list[str] = []
    names = {character["name"] for character in definition["characters"]}
    seats = set(seat_labels(definition["num_characters"]))

    if not set(placements.keys()).issubset(seats):
        violations.append("נמצאו כיסאות לא חוקיים בניסיון הנוכחי.")
        return violations, False
    if len(set(placements.values())) != len(placements):
        violations.append("אי אפשר להציב את אותה דמות ביותר מכיסא אחד.")
        return violations, False
    if not set(placements.values()).issubset(names):
        violations.append("נמצאו דמויות לא חוקיות בניסיון הנוכחי.")
        return violations, False

    character_to_seat = invert_solution(placements)
    for constraint in definition["constraints"]:
        needed_characters = referenced_characters(constraint)
        if not all(character in character_to_seat for character in needed_characters):
            continue
        if not evaluate_constraint(constraint, placements, definition["num_characters"]):
            violations.append(constraint["text"])

    complete = len(placements) == definition["num_characters"]
    return violations, complete


def next_hint(definition: dict[str, Any], placements: dict[str, str]) -> str:
    for seat_label in seat_labels(definition["num_characters"]):
        expected_character = definition["solution"][seat_label]
        if placements.get(seat_label) != expected_character:
            seat_number = seat_index(seat_label) + 1
            return f"רמז: {expected_character} יושב/ת בכיסא {seat_number}."
    return "כל הכבוד, כל הדמויות כבר במקום הנכון."
