# YouTube Video Summarizer

## Run Commands

Use the project virtual environment from the root folder.

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
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' backend/main_api.py
```

### Legacy CLI flow
```powershell
& 'c:/Users/Asus/Desktop/YouTube_Video_ Summarizer/venv/Scripts/python.exe' main.py
```

`main.py` is now a deprecated pointer. Prefer `scripts/summarize_video.py` for single videos and `backend/main_api.py` for the API.

## Notes

- Core modules live in `app/`.
- Generated JSON files live in `data/`.
- Reference docs live in `docs/`.
