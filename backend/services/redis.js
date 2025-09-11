require('dotenv').config(); 
const { Redis } = require('@upstash/redis');

// Expect UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in env
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL,
	token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function buildHoldKey(tripId, seatNumber) {
	return `hold:${tripId}:${seatNumber}`;
}

async function holdSeat(tripId, seatNumber, userId, ttlSeconds) {
	const key = buildHoldKey(tripId, seatNumber);
	// Store metadata for the hold; value contains userId and seat info
	const value = JSON.stringify({ tripId, seatNumber, userId, createdAt: Date.now() });
	// Set value with TTL only if not exists to avoid overwriting another hold
	// Using SET with NX and EX to enforce TTL in seconds
	const result = await redis.set(key, value, { nx: true, ex: ttlSeconds });
	return result === 'OK';
}

async function releaseHold(tripId, seatNumber) {
	const key = buildHoldKey(tripId, seatNumber);
	await redis.del(key);
	return true;
}

async function getHold(tripId, seatNumber) {
	const key = buildHoldKey(tripId, seatNumber);
	console.log('getHold looking for key:', key);
	const raw = await redis.get(key);
	console.log('getHold raw result:', raw);
	if (!raw) return null;
	// Upstash client may already return an object if JSON was stored
	if (typeof raw === 'object') {
		return raw;
	}
	try {
		const parsed = JSON.parse(raw);
		console.log('getHold parsed result:', parsed);
		return parsed;
	} catch (e) {
		console.log('getHold parse error:', e);
		return null;
	}
}

// Get all holds for a trip (alternative to keys() which doesn't work with Upstash REST)
async function getTripHolds(tripId) {
	// Since keys() doesn't work with Upstash REST, we'll use a different approach
	// Store trip holds in a set: trip_holds:1 -> [seat1, seat2, ...]
	const setKey = `trip_holds:${tripId}`;
	const seatNumbers = await redis.smembers(setKey);
	return seatNumbers || [];
}

// Update holdSeat to also add to the trip set
async function holdSeat(tripId, seatNumber, userId, ttlSeconds) {
	const key = buildHoldKey(tripId, seatNumber);
	const setKey = `trip_holds:${tripId}`;
	
	// Store metadata for the hold
	const value = JSON.stringify({ tripId, seatNumber, userId, createdAt: Date.now() });
	
	// Set value with TTL only if not exists
	const result = await redis.set(key, value, { nx: true, ex: ttlSeconds });
	console.log('holdSeat result for', key, ':', result);
	
	if (result === 'OK') {
		// Add seat to trip holds set
		await redis.sadd(setKey, seatNumber);
		// Set TTL on the set as well
		await redis.expire(setKey, ttlSeconds);
		console.log('Added', seatNumber, 'to trip holds set');
		return true;
	}
	console.log('Failed to hold seat - already exists or Redis error');
	return false;
}

// Update releaseHold to also remove from the trip set
async function releaseHold(tripId, seatNumber) {
	const key = buildHoldKey(tripId, seatNumber);
	const setKey = `trip_holds:${tripId}`;
	
	await redis.del(key);
	await redis.srem(setKey, seatNumber);
	return true;
}

module.exports = {
	redis,
	holdSeat,
	releaseHold,
	getHold,
	getTripHolds,
};


