# YouTube Video Summarizer

## Project Structure

```text
youtube-video-summarizer/
  backend/
    app/
      main.py
      routes/
      services/
      schemas/
      core/
    requirements.txt

  frontend/
    package.json
    src/
      components/
      pages/
      api/

  data/
    summary_data.json

  scripts/
    summarize_video.py
    debug_chunk.py

  README.md
  .env.example
```

## Run Commands

Use the project virtual environment from the root folder.

### Central launcher
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' main.py
```

From the launcher menu:
- option 1: single video summary
- option 2: FastAPI backend
- option 3: test summarizer
- option 4: debug chunk helper
- option 5: legacy batch summary

### Single video summary
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' scripts/summarize_video.py
```

### Batch channel summary
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' scripts/run_summary.py
```

### Debug chunk size
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' scripts/debug_chunk.py
```

### Test summarizer
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' scripts/test_summarizer.py
```

### FastAPI backend
Use option 2 from `main.py`, or run:

```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' -m uvicorn backend.app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

`main.py` is now the central launcher. Use it when you want one entry point for the project.

## Notes

- Backend API entry point lives in `backend/app/main.py`.
- Core backend modules live in `backend/app/services/`.
- Shared backend constants/prompts live in `backend/app/core/`.
- Generated JSON files live in `data/`.
- Reference docs live in `docs/`.
- The frontend currently expects a video-based API contract. The existing backend still has the older channel-based `/summarize` route, so API alignment is the next integration step.
