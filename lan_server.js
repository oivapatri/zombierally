const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT || 8080);

// Serve zombie_racing.html directly at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'zombie_racing.html'));
});

app.use(express.static(__dirname));

let hostSocket = null;
let nextPlayerId = 1;

function sendJson(socket, payload) {
  if (!socket || socket.readyState !== 1) {
    return;
  }
  socket.send(JSON.stringify(payload));
}

wss.on('connection', (socket) => {
  socket.role = 'unknown';
  socket.playerId = `p${nextPlayerId++}`;

  sendJson(socket, { type: 'hello', playerId: socket.playerId });

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === 'host') {
      socket.role = 'host';
      hostSocket = socket;
      sendJson(socket, { type: 'status', text: 'Host online' });
      return;
    }

    if (message.type === 'join') {
      socket.role = 'client';
      sendJson(socket, { type: 'status', text: hostSocket ? 'Joined room' : 'Joined, waiting for host' });
      return;
    }

    if (message.type === 'input' && socket.role === 'client' && hostSocket) {
      sendJson(hostSocket, {
        type: 'remoteInput',
        playerId: socket.playerId,
        payload: message.payload || {}
      });
      return;
    }

    if (message.type === 'playerState') {
      // Relay this player's car position to all other connected clients
      const relay = { type: 'playerState', playerId: socket.playerId, car: message.car };
      for (const client of wss.clients) {
        if (client !== socket && client.readyState === 1) {
          sendJson(client, relay);
        }
      }
      return;
    }

    if (message.type === 'state' && socket.role === 'host') {
      for (const client of wss.clients) {
        if (client !== socket && client.readyState === 1) {
          sendJson(client, { type: 'state', payload: message.payload });
        }
      }
    }
  });

  socket.on('close', () => {
    if (socket === hostSocket) {
      hostSocket = null;
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          sendJson(client, { type: 'status', text: 'Host disconnected' });
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LAN server running on http://0.0.0.0:${PORT}`);
  console.log(`Open zombie_racing.html from another device using host LAN IP.`);
});
