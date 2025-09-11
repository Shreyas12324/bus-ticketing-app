# Stage 1: Build
FROM node:18-bullseye AS build
WORKDIR /app

# Copy entire repo
COPY . .

# Install frontend deps and build if present
RUN if [ -f "frontend/package.json" ]; then \
    cd frontend && npm ci --no-audit --no-fund && \
    npm run build; \
  else \
    echo "No frontend detected, skipping frontend build"; \
  fi

# Install backend production dependencies
RUN cd backend && npm ci --only=production --no-audit --no-fund

# Stage 2: Runtime
FROM node:18-bullseye-slim AS runtime
WORKDIR /app

# Copy backend runtime
COPY --from=build /app/backend ./backend

# Copy frontend build into backend public directory if it exists
RUN mkdir -p /app/backend/public \
    && if [ -d "/app/frontend/build" ]; then \
         cp -r /app/frontend/build/* /app/backend/public/; \
       elif [ -d "/app/frontend/dist" ]; then \
         cp -r /app/frontend/dist/* /app/backend/public/; \
       else \
         echo "No frontend build artifacts found"; \
       fi

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/index.js"]
