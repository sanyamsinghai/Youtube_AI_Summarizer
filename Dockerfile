# --- Frontend Build Stage ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend configuration files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source files
COPY frontend/ ./

# Build frontend to dist/ folder
RUN npm run build

# --- Backend Runner Stage ---
FROM python:3.10-slim AS runner
WORKDIR /app

# Install system dependencies if any are needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application files and bootstrap script
COPY backend/ ./backend/
COPY bootstrap.py ./

# Copy built frontend assets from the frontend build stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose default port
EXPOSE 8000

# Set environment to production
ENV ENV=production

# Run FastAPI app via Uvicorn with support for dynamic PORT env variable
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
