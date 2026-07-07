"""
Central launcher for the YouTube Video Summarizer project.

Run this file to choose which part of the project to execute:
- single-video summarizer
- FastAPI backend
- test summarizer
- debug chunk helper
- legacy batch summary script
"""

from __future__ import annotations

import runpy
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
BACKEND_DIR = ROOT_DIR / "backend" / "app"


MENU = {
    "1": ("Single video summarizer", SCRIPTS_DIR / "summarize_video.py"),
    "2": ("FastAPI backend", BACKEND_DIR / "main.py"),
    "3": ("Test summarizer", SCRIPTS_DIR / "test_summarizer.py"),
    "4": ("Debug chunk helper", SCRIPTS_DIR / "debug_chunk.py"),
    "5": ("Legacy batch summary", SCRIPTS_DIR / "run_summary.py"),
}


def run_python_script(script_path: Path):
    if not script_path.exists():
        print(f"File not found: {script_path}")
        return

    runpy.run_path(str(script_path), run_name="__main__")


def run_backend():
    try:
        import uvicorn  # noqa: F401
    except ImportError:
        print("uvicorn is not installed, so the backend server cannot be started from main.py.")
        print("Install uvicorn first, then run the backend command again.")
        return

    print("Starting FastAPI backend on http://127.0.0.1:8000")
    subprocess.run([sys.executable, "-m", "uvicorn", "backend.app.main:app", "--reload"], cwd=str(ROOT_DIR))


def show_menu():
    print("\nYouTube Video Summarizer Launcher")
    print("=" * 40)
    for key, (label, _) in MENU.items():
        print(f"{key}. {label}")
    print("6. Exit")


def main():
    while True:
        show_menu()
        choice = input("\nChoose an option: ").strip()

        if choice == "6":
            print("Goodbye.")
            return

        if choice == "2":
            run_backend()
            continue

        if choice in MENU:
            _, script_path = MENU[choice]
            run_python_script(script_path)
            continue

        print("Invalid choice. Please select a number from the menu.")


if __name__ == "__main__":
    main()
