// Basic Express server setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const { initializeDatabase,sequelize } = require('./db');
const http = require('http');
const { attachWebSocket } = require('./websocket-server');

// Routers
const tripsRouter = require('./routes/trips');
const seatsRouter = require('./routes/seats');
const purchasesRouter = require('./routes/purchases');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS for frontend on 3001
app.use(cors({
	origin: ['http://localhost:3001'],
	credentials: true,
}));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// Health check route
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
});

// Keep-alive route
app.get('/keep-alive', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ ok: true, ts: Date.now() });
  } catch (error) {
    console.error('Keep-alive DB check failed:', error);
    res.status(500).json({ ok: false, error: 'DB not responding' });
  }
});

// Mount routers
app.use('/', tripsRouter);
app.use('/', seatsRouter);
app.use('/', purchasesRouter);

// Serve React app for all non-API routes (must be last)
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
	const server = http.createServer(app);
	attachWebSocket(server);
	server.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}`);
	});
}).catch((err) => {
	console.error('Failed to initialize database:', err);
	process.exit(1);
});

module.exports = app;


