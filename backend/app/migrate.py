import os
import sys
import logging
from alembic.config import Config
from alembic import command

logger = logging.getLogger("db_migration")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

def get_alembic_config() -> Config:
    """Locate alembic.ini and return configured Alembic Config object."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Check parent directory (project root: My_Pet_Center_Railway_Ready)
    candidate_paths = [
        os.path.abspath(os.path.join(current_dir, "..", "..", "alembic.ini")),
        os.path.abspath(os.path.join(current_dir, "..", "alembic.ini")),
        os.path.abspath("alembic.ini"),
    ]
    
    ini_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            ini_path = p
            break

    if not ini_path:
        raise FileNotFoundError(f"Could not locate alembic.ini in candidates: {candidate_paths}")

    alembic_cfg = Config(ini_path)
    
    # Ensure alembic script location points to absolute directory
    alembic_dir = os.path.abspath(os.path.join(os.path.dirname(ini_path), "alembic"))
    if os.path.exists(alembic_dir):
        alembic_cfg.set_main_option("script_location", alembic_dir)

    return alembic_cfg

def run_migrations():
    """
    Execute all pending Alembic migrations up to head.
    Fails safely with clear logging if any migration fails.
    """
    logger.info("Starting safe database migration process...")
    try:
        cfg = get_alembic_config()
        command.upgrade(cfg, "head")
        logger.info("Database migration completed successfully (head reached).")
        return True
    except Exception as exc:
        logger.error(f"DATABASE MIGRATION FAILED: {exc}", exc_info=True)
        # Fail safely: raise exception to prevent application startup on corrupt/incomplete schema
        raise RuntimeError(f"Database migration aborted due to error: {exc}") from exc

if __name__ == "__main__":
    try:
        run_migrations()
        sys.exit(0)
    except Exception:
        sys.exit(1)

