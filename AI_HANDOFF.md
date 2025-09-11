# AI Handoff File - Bus Ticketing App

## Current Status
- **Backend**: Express, Sequelize, Redis (Upstash), WebSocket, SendGrid — production-ready
- **Frontend**: React app with real-time updates, multi-select hold/purchase, invoice viewing
- **State**: Full flow working (multi-hold → multi-purchase → per-seat invoice PDF + email). Redis held seats are reflected accurately; email delivery works with verified `EMAIL_FROM`.

## Problem Statement (original)
Initially, holds succeeded but `GET /trips/:id` showed `heldSeats: []`. Root causes:
1) Upstash REST doesn’t support `KEYS` pattern scan
2) `redis.get()` sometimes returned an already-parsed object, causing JSON.parse to throw

## Current File Structure
```
backend/
├── index.js              # Express server with CORS, routes mounted
├── db.js                 # Sequelize init with Supabase Postgres
├── websocket-server.js   # WebSocket server on port 8080
├── models/
│   ├── index.js          # Exports sequelize + models
│   ├── busTrip.js        # Trip model
│   ├── seatHold.js       # Seat hold model
│   ├── purchase.js       # Purchase model
│   └── user.js           # User model
├── services/
│   ├── redis.js          # Upstash Redis client
│   └── email.js          # SendGrid + PDFKit
└── routes/
    ├── trips.js          # GET /trips, POST /trips, GET /trips/:id
    ├── seats.js          # POST /seats/hold, POST /seats/release
    └── purchases.js      # POST /seats/purchase

frontend/
├── src/
│   ├── components/
│   │   ├── TripList.jsx  # Fetches /trips
│   │   ├── TripPage.jsx  # WebSocket + seat map
│   │   └── SeatMap.jsx   # Visual seat grid
│   ├── App.jsx           # React Router
│   └── index.jsx         # ReactDOM render
└── package.json          # React dependencies
```

## Fixes & Features Implemented
1) Replaced `KEYS` usage with per-trip Set tracking
   - `backend/services/redis.js`
     - Added `getTripHolds(tripId)` using `SMEMBERS trip_holds:<tripId>`
     - Updated `holdSeat` to `SADD` seat into `trip_holds:<tripId>` and set TTL on the set
     - Updated `releaseHold` to `SREM` from the set
   - `backend/routes/trips.js`
     - Now uses `getTripHolds(tripId)` to populate `heldSeats`

2) Made `getHold()` robust to Upstash return types
   - If `redis.get()` returns an object, use it directly; otherwise JSON.parse string

3) Multi-seat hold & purchase
   - `POST /seats/hold` accepts `{ tripId, userId, ttlSeconds, seatNumbers[] }`, returns `{ held, conflicts, success }`, broadcasts per-seat `seat-held`
   - `POST /seats/purchase` accepts `{ tripId, userId, email, seatNumbers[] }`, validates holds, writes purchases transactionally, releases holds, broadcasts `seat-sold`

4) Invoice generation & links
   - Purchase response includes `invoiceLink` per seat
   - `GET /invoices?tripId&seatNumber&userId` streams PDF via `generateInvoicePDF`

Result: `GET /trips/:id` reflects held seats; purchases validate against live holds; invoices are viewable immediately.

## Test Commands
```powershell
# Hold seat
$body = @{ tripId=1; seatNumber="E1"; userId=123; ttlSeconds=60 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/seats/hold -ContentType "application/json" -Body $body

# Check status
curl.exe http://localhost:3000/trips/1
```

## Email Notes
- Requires `SENDGRID_API_KEY` and `EMAIL_FROM`
- `EMAIL_FROM` must be a verified Single Sender or from a domain authenticated in SendGrid
- Reply-To can be the same as `EMAIL_FROM` or another monitored inbox

## Next Steps (if extending)
- Persist invoice PDFs to object storage (S3/GCS) and set permanent `invoiceLink`
- Organizer auth and trip management
- Add organizer auth and trip management
- Add rate limits and idempotency for purchase endpoint

## Frontend Highlights
- `TripList.jsx`
  - Search by source/destination/date. If no match, auto-creates a trip and navigates to booking
  - Direct navigation to booking for fastest path (UI can be polished later)
- `TripPage.jsx`
  - Select seats (green), hold seats; WS updates mark held (orange) and sold (red) in all tabs
  - Held-seat TTL countdown, expiry warnings, release/sold toasts, per-seat invoice buttons
  - User ID input used for all API calls; also stored via header login if used
- `SeatMap.jsx`
  - Clear color legend, non-clickable held/sold seats, “mine” highlight, ticking countdown
  - Wrapped in a light card (white background) for readability over video

## Environment Variables Needed
- `SUPABASE_DB_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`

## Working Features
- ✅ Trip creation and listing
- ✅ WebSocket real-time updates
- ✅ Seat hold creation with TTL (Redis Upstash)
- ✅ Held seats visible in API and UI
- ✅ Purchase transaction + email with PDF (when email env is set)

## Tech Stack
- Backend: Node.js, Express, Sequelize, PostgreSQL, Upstash Redis, WebSocket, SendGrid
- Frontend: React, React Router, Axios
- Deployment: Docker, cron-job.org for keep-alive
