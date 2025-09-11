# Production-ready Dockerfile for combined frontend + backend
# - Builds frontend (if present) and backend
# - Copies frontend build into backend static directory
# - Runs backend on port 3000

FROM node:18-alpine AS build
WORKDIR /app

# --- Frontend build ---
COPY frontend/package.json frontend/package-lock.json ./frontend/
# Use npm install to avoid strict lockfile requirements in CI images
RUN cd frontend && npm install --no-audit --no-fund
COPY frontend ./frontend
RUN cd frontend && npm run build

# --- Backend install (production deps only) ---
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev --no-audit --no-fund
COPY backend ./backend

# Runtime image
FROM node:18-alpine AS runtime
WORKDIR /app

# Copy backend runtime
COPY --from=build /app/backend ./backend

# Copy frontend build into backend public directory
RUN mkdir -p /app/backend/public
COPY --from=build /app/frontend/build/ /app/backend/public/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/index.js"]


