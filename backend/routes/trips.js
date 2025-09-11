const express = require('express');
const router = express.Router();

const { models: { BusTrip, Purchase } } = require('../models');
const { getTripHolds } = require('../services/redis');

// GET /trips - List all bus trips
router.get('/trips', async (req, res) => {
	try {
		const trips = await BusTrip.findAll({ order: [['departureTime', 'ASC']] });
		return res.status(200).json(trips);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to list trips', details: err.message });
	}
});

// POST /trips - Create a new bus trip
router.post('/trips', async (req, res) => {
	try {
		const {
			routeDetails,
			departureTime,
			arrivalTime,
			busType,
			layout,
			pricePerSeat,
			saleDuration,
		} = req.body || {};

		if (!routeDetails || !departureTime || !arrivalTime || !busType || !layout || pricePerSeat == null || saleDuration == null) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		const trip = await BusTrip.create({
			routeDetails,
			departureTime,
			arrivalTime,
			busType,
			layout,
			pricePerSeat,
			saleDuration,
		});

		return res.status(201).json(trip);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to create trip', details: err.message });
	}
});

// GET /trips/:id - Get trip details + seat status
router.get('/trips/:id', async (req, res) => {
	console.log('GET /trips/:id called with id:', req.params.id);
	try {
		const tripId = parseInt(req.params.id, 10);
		const trip = await BusTrip.findByPk(tripId);
		if (!trip) return res.status(404).json({ error: 'Trip not found' });

		// Sold seats from DB
		const purchases = await Purchase.findAll({ where: { tripId }, attributes: ['seatNumber'] });
		const soldSeats = purchases.map((p) => p.seatNumber);

		// Held seats from Redis
		const heldSeats = await getTripHolds(tripId);
		console.log('Redis heldSeats for trip', tripId, ':', heldSeats);

		return res.status(200).json({
			trip,
			status: {
				soldSeats,
				heldSeats,
			},
		});
	} catch (err) {
		return res.status(500).json({ error: 'Failed to fetch trip', details: err.message });
	}
});

// Admin/dev utility: reset all purchases for a trip (dangerous; for demos)
router.post('/trips/:id/reset-purchases', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid trip id' });
    const deleted = await Purchase.destroy({ where: { tripId: id } });
    return res.json({ ok: true, deleted });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to reset purchases', details: e.message });
  }
});

module.exports = router;


