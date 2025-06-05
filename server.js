const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QUESTIONS = require('./data/questions.json');

const app = express();
const server = http.createServer(app);

// In-memory room storage
const rooms = {};

// Each "team" is just a single player
function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      phase: 'lobby',
      ladderHeight: 12,
      qIndex: 0,
      teams: [] // Each team is a player
    };
  }
  return rooms[roomId];
}

// Each player is their own team
function assignPlayerAsTeam(room, nick, socketId) {
  // Prevent duplicate join
  if (room.teams.some(t => t.player && t.player.id === socketId)) {
    return room.teams.find(t => t.player && t.player.id === socketId);
  }
  const team = {
    id: room.teams.length,
    rung: 0,
    player: { id: socketId, nick }
  };
  room.teams.push(team);
  return { team, player: team.player };
}

function startQuestionLoop(roomId) {
  const room = getOrCreateRoom(roomId);
  const playerCount = room.teams.length;
  if (playerCount < 2 || room.qInterval) return;

  room.qInterval = setInterval(() => {
    const q = QUESTIONS[room.qIndex % QUESTIONS.length];
    room.qIndex = (room.qIndex + 1) % QUESTIONS.length;
    room.currentQuestion = q;
    room.answeredSockets = new Set();
    io.to(roomId).emit('question', {
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      timeMs: 15000,
    });
  }, 15000);
}

function createRoomSnapshot(room) {
  const snapshot = {
    phase: room.phase,
    ladderHeight: room.ladderHeight,
    qIndex: room.qIndex,
    teams: room.teams.map(t => ({
      id: t.id,
      rung: t.rung,
      players: [t.player], // Keep as array for client compatibility
    })),
  };
  if (room.currentQuestion) {
    snapshot.currentQuestion = {
      id: room.currentQuestion.id,
      prompt: room.currentQuestion.prompt,
      options: room.currentQuestion.options,
    };
  }
  return snapshot;
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
    if (!roomId || !nick) {
      socket.emit('joinError', 'Room and team name required');
      return;
    }
    const room = getOrCreateRoom(roomId);
    const { team, player } = assignPlayerAsTeam(room, nick, socket.id);
    socket.join(roomId);
    socket.roomId = roomId;

    // Send updated snapshot to everyone in the room
    io.to(roomId).emit('snapshot', createRoomSnapshot(room));
    io.to(roomId).emit('playerJoined', { roomId, team, player });

    // Only start the question loop if there are at least 2 players
    const playerCount = room.teams.length;
    if (playerCount >= 2) {
      startQuestionLoop(roomId);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    // Remove the team (player) for this socket
    for (let i = room.teams.length - 1; i >= 0; i--) {
      const team = room.teams[i];
      if (team.player && team.player.id === socket.id) {
        room.teams.splice(i, 1);
        break;
      }
    }

    const playerCount = room.teams.length;
    if (playerCount < 2 && room.qInterval) {
      clearInterval(room.qInterval);
      room.qInterval = null;
    }

    if (room.teams.length === 0) {
      if (room.qInterval) {
        clearInterval(room.qInterval);
      }
      delete rooms[roomId];
    }
  });

  socket.on('answer', ({ roomId, id, answer }) => {
    const room = getOrCreateRoom(roomId);
    if (!room.currentQuestion || room.currentQuestion.id !== id) return;
    if (room.answeredSockets && room.answeredSockets.has(socket.id)) return;
    room.answeredSockets.add(socket.id);

    // find player's team
    let team, teamIndex;
    for (let i = 0; i < room.teams.length; i++) {
      const t = room.teams[i];
      if (t.player && t.player.id === socket.id) {
        team = t;
        teamIndex = i;
        break;
      }
    }
    if (!team) return;

    const q = room.currentQuestion;
    if (answer === q.answer) {
      team.rung = (team.rung || 0) + 1;
      io.to(roomId).emit('climb', {
        teamId: team.id !== undefined ? team.id : teamIndex,
        rung: team.rung,
      });
      if (team.rung >= room.ladderHeight) {
        io.to(roomId).emit('gameOver', { winners: [team.id !== undefined ? team.id : teamIndex] });
        room.phase = 'finished';
        clearInterval(room.qInterval);
        room.qInterval = null;
      }
    } else {
      socket.emit('answerWrong');
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});

module.exports = io;