const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// In-memory room storage
const rooms = {};

function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      phase: 'lobby',
      ladderHeight: 12,
      qIndex: 0,
      teams: []
    };
  }
  return rooms[roomId];
}

function assignToSmallestTeam(room, nick, socketId) {
  while (room.teams.length < 5) {
    room.teams.push({ players: [] });
  }

  let smallest = room.teams[0];
  for (const team of room.teams) {
    if (team.players.length < smallest.players.length) {
      smallest = team;
    }
  }

  const player = { id: socketId, nick };
  smallest.players.push(player);
  return { team: smallest, player };
}

// Serve static files from public directory
app.use(express.static('public'));

// Attach Socket.IO with no CORS restrictions for development
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, nick }) => {
    const room = getOrCreateRoom(roomId);
    const { team, player } = assignToSmallestTeam(room, nick, socket.id);
    socket.join(roomId);
    socket.emit('snapshot', room);
    io.to(roomId).emit('playerJoined', { roomId, team, player });
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

module.exports = io;
