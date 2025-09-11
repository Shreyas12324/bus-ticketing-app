const WebSocket = require('ws');

let wss = null;
let heartbeatInterval = null;

function attachWebSocket(server) {
  // Attach WebSocket server to existing HTTP/S server (same port as Express)
  wss = new WebSocket.Server({ server });

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
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000);

  wss.on('close', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  return wss;
}

function broadcastSeatUpdate(update) {
  if (!wss) return;
  const payload = JSON.stringify(update);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

module.exports = {
  attachWebSocket,
  broadcastSeatUpdate,
};


