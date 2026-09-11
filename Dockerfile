# Multi-stage Dockerfile for My Pet Center Production Full-Stack App

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Files
FROM python:3.11-slim

# Create non-root user (UID 1000 standard for Hugging Face Spaces & security)
RUN useradd -m -u 1000 user

WORKDIR /app
RUN chown -R user:user /app

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and built frontend
COPY --chown=user:user backend/ ./backend/
COPY --chown=user:user --from=frontend-builder /app/frontend/dist ./frontend/dist

USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HOST=0.0.0.0 \
    PORT=7860 \
    PYTHONPATH=/app

EXPOSE 7860

CMD ["sh", "-c", "python -m backend.app.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
