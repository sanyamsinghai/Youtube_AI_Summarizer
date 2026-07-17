@echo off
echo Starting YouTube AI Summarizer...

:: 1. Launch FastAPI Backend in a new window
start "FastAPI Backend" cmd /k "venv\Scripts\activate && python main.py"

:: 2. Launch Vite Frontend in another new window
start "Vite Frontend" cmd /k "cd frontend && npm run dev"
