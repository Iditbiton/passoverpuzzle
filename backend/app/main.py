import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, auth, player
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_startup_migrations
from app.seed.seed_data import seed_initial_data


logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    run_startup_migrations(engine)
    with SessionLocal() as session:
        seed_initial_data(
            session,
            admin_username=settings.admin_username,
            admin_password=settings.admin_password,
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(player.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
