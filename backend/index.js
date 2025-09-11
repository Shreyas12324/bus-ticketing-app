// Basic Express server setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./db');

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

// Health check route
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
});

// Keep-alive route
app.get('/keep-alive', (req, res) => {
	res.status(200).json({ ok: true, ts: Date.now() });
});

// Root route placeholder
app.get('/', (req, res) => {
	res.send('Bus Ticketing API is running');
});

// Mount routers
app.use('/', tripsRouter);
app.use('/', seatsRouter);
app.use('/', purchasesRouter);

const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
	app.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}`);
	});
}).catch((err) => {
	console.error('Failed to initialize database:', err);
	process.exit(1);
});

module.exports = app;


