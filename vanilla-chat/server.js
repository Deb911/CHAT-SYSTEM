// SyncChat WebSocket Server
// Runs on ws://localhost:8080 (dev) or wss://your-render-url (prod)
// Handles real-time messaging between users in named rooms

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 8080;

// HTTP server (required by Render.com to keep process alive)
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncChat WebSocket Server is running ✅');
});

const wss = new WebSocketServer({ server: httpServer });

// rooms: { roomCode: Set<WebSocket> }
const rooms = new Map();

function getRoomClients(roomCode) {
  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
  return rooms.get(roomCode);
}

function broadcastToRoom(roomCode, message, senderWs) {
  const clients = getRoomClients(roomCode);
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  let userRoom = null;
  let userInfo = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join') {
      // Join a room
      userRoom = msg.room;
      userInfo = { id: msg.user_id, email: msg.email };

      const clients = getRoomClients(userRoom);
      clients.add(ws);

      // Notify everyone in room of new presence
      const onlineList = [];
      clients.forEach(c => { if (c._userInfo) onlineList.push(c._userInfo); });
      ws._userInfo = userInfo;
      onlineList.push(userInfo);

      broadcastToRoom(userRoom, { type: 'presence', users: onlineList }, null);
      console.log(`[JOIN] ${userInfo.email} → room ${userRoom} (${clients.size} online)`);

    } else if (msg.type === 'message') {
      // Broadcast message to everyone in the room INCLUDING sender
      if (!userRoom) return;
      broadcastToRoom(userRoom, { type: 'message', payload: msg.payload }, null);
      console.log(`[MSG] ${userInfo?.email} in ${userRoom}: ${msg.payload.content.slice(0, 40)}`);

    } else if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  });

  ws.on('close', () => {
    if (userRoom) {
      const clients = getRoomClients(userRoom);
      clients.delete(ws);
      console.log(`[LEAVE] ${userInfo?.email} left room ${userRoom} (${clients.size} remaining)`);

      // Broadcast updated presence
      const onlineList = [];
      clients.forEach(c => { if (c._userInfo) onlineList.push(c._userInfo); });
      broadcastToRoom(userRoom, { type: 'presence', users: onlineList }, null);

      if (clients.size === 0) rooms.delete(userRoom);
    }
  });

  ws.on('error', (err) => console.error('[WS Error]', err.message));
});

httpServer.listen(PORT, () => {
  console.log(`✅ SyncChat WebSocket server running on port ${PORT}`);
  console.log('   Waiting for connections...\n');
});
