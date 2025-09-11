const WebSocket = require('ws');

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
	ws.isAlive = true;

	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.on('message', () => {
		// No-op: server is broadcast-only for now
	});
});

// Heartbeat to terminate dead connections
const interval = setInterval(() => {
	wss.clients.forEach((ws) => {
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping(() => {});
	});
}, 30000);

wss.on('close', () => {
	clearInterval(interval);
});

function broadcastSeatUpdate(update) {
	const payload = JSON.stringify(update);
	for (const client of wss.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	}
}

module.exports = {
	wss,
	broadcastSeatUpdate,
};


