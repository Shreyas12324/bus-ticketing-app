# Production-ready Dockerfile for combined frontend + backend

FROM node:18-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache bash git

# Copy entire repo
COPY . .

# Install and build frontend if present
RUN if [ -f "frontend/package.json" ]; then \
	  cd frontend && npm ci --no-audit --no-fund && npm run build; \
	else \
	  echo "No frontend detected, skipping frontend build"; \
	fi

# Install backend deps (production)
RUN cd backend && npm ci --only=production --no-audit --no-fund

FROM node:18-alpine AS runtime
WORKDIR /app

# Copy backend runtime
COPY --from=build /app/backend ./backend

# Copy frontend build into backend public directory if produced
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
