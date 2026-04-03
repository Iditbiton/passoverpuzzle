from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _add_column_if_missing(
    engine: Engine, table_name: str, column_name: str, column_sql: str
) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}")
        )


def run_startup_migrations(engine: Engine) -> None:
    _add_column_if_missing(engine, "puzzle_characters", "image_url", "VARCHAR(500)")
