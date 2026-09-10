import os
import sys
import subprocess
import threading
import time
import shutil

# Root path configuration
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
VENV_DIR = os.path.join(ROOT_DIR, "venv")

# Determine Python and pip executables inside the virtual environment
if sys.platform == "win32":
    PYTHON_EXE = os.path.join(VENV_DIR, "Scripts", "python.exe")
    PIP_EXE = os.path.join(VENV_DIR, "Scripts", "pip.exe")
    UVICORN_EXE = os.path.join(VENV_DIR, "Scripts", "uvicorn.exe")
else:
    PYTHON_EXE = os.path.join(VENV_DIR, "bin", "python")
    PIP_EXE = os.path.join(VENV_DIR, "bin", "pip")
    UVICORN_EXE = os.path.join(VENV_DIR, "bin", "uvicorn")


def log(section, msg):
    print(f"\n========================================\n[{section}] {msg}\n========================================")


def setup_venv():
    if not os.path.exists(VENV_DIR):
        log("SETUP", "Creating virtual environment in venv/ ...")
        subprocess.check_call([sys.executable, "-m", "venv", "venv"])
    else:
        log("SETUP", "Virtual environment venv/ already exists.")

    log("SETUP", "Installing backend dependencies...")
    subprocess.check_call([PYTHON_EXE, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([PIP_EXE, "install", "-r", os.path.join(BACKEND_DIR, "requirements.txt")])


def seed_database():
    log("DATABASE", "Running seed.py script to initialize services and settings...")
    # Add root folder to PYTHONPATH to make sure import statements resolve correctly
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT_DIR
    subprocess.check_call([PYTHON_EXE, "-m", "backend.app.seed"], env=env)


def setup_frontend():
    if not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
        log("SETUP", "Installing frontend node dependencies (npm install)...")
        # Run npm install on windows shell or unix shell
        shell = sys.platform == "win32"
        subprocess.check_call(["npm", "install"], cwd=FRONTEND_DIR, shell=shell)
    else:
        log("SETUP", "Frontend node_modules already installed.")


def run_process_and_log(cmd, cwd, prefix, env=None):
    shell = sys.platform == "win32"
    p = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=shell,
        env=env
    )
    
    # Read output line by line and print with prefix
    for line in iter(p.stdout.readline, ""):
        print(f"[{prefix}] {line.strip()}")
    p.stdout.close()
    p.wait()
    return p


def main():
    try:
        # Step 1: Backend Python Environment setup
        setup_venv()

        # Step 2: Database Seeding
        seed_database()

        # Step 3: Frontend setup
        setup_frontend()

        # Step 4: Run both servers in parallel
        log("RUN", "Starting Backend (FastAPI: port 8000) and Frontend (React/Vite: port 5173)...")

        # Set up PYTHONPATH for FastAPI uvicorn execution
        backend_env = os.environ.copy()
        backend_env["PYTHONPATH"] = ROOT_DIR

        backend_cmd = [UVICORN_EXE, "backend.app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
        frontend_cmd = ["npm", "run", "dev"]

        # Run Backend Thread
        backend_thread = threading.Thread(
            target=run_process_and_log,
            args=(backend_cmd, ROOT_DIR, "BACKEND", backend_env),
            daemon=True
        )

        # Run Frontend Thread
        frontend_thread = threading.Thread(
            target=run_process_and_log,
            args=(frontend_cmd, FRONTEND_DIR, "FRONTEND"),
            daemon=True
        )

        backend_thread.start()
        frontend_thread.start()

        # Keep main thread alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        log("SHUTDOWN", "Stopping both FastAPI backend and React frontend servers...")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        log("ERROR", f"Subprocess command failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
