## Bus Ticketing App

Production-ready backend-first ticketing system with seat holds, purchases, PDF invoices, WebSocket updates, and Redis TTL holds.

### Tech Stack
- Node.js (Express)
- Sequelize + PostgreSQL (Supabase-compatible)
- Upstash Redis (REST)
- WebSocket server
- SendGrid + PDFKit
- Docker (multi-stage)

### Structure
- `backend/index.js` – Express entry
- `backend/db.js` – Sequelize init
- `backend/models/` – ORM models and loader
- `backend/services/redis.js` – Upstash holds
- `backend/services/email.js` – PDF + SendGrid
- `backend/websocket-server.js` – WS + broadcast
- `backend/routes/` – trips, seats, purchases

### Env Vars
- `PORT` (default 3000)
- `SUPABASE_DB_URL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENDGRID_API_KEY`, `EMAIL_FROM`

### Run Locally
```bash
cd backend
npm install
node index.js
and for frontend
cd frontend
npm install
npm start
```

### Docker
```bash
docker build -t bus-ticketing-app .
docker run -p 3000:3000 -p 8080:8080 \
  -e SUPABASE_DB_URL=postgres://... \
  -e UPSTASH_REDIS_REST_URL=... \
  -e UPSTASH_REDIS_REST_TOKEN=... \
  -e SENDGRID_API_KEY=... \
  -e EMAIL_FROM=no-reply@example.com \
  bus-ticketing-app
```

### Keep-Alive (cron-job.org)
Direct URL example:
```
https://bus-ticketing-app-odk3.onrender.com/keep-alive

```

### Production Notes
- Redis holds use `SET NX` with `EX` TTL
- DB transaction guards duplicate purchases
- Broadcast events: `seat-held`, `seat-released`, `seat-sold`


