const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QUESTIONS = require('./data/questions.json');

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
    room.teams.push({ id: room.teams.length, players: [], rung: 0 });
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

function startQuestionLoop(roomId) {
  const room = getOrCreateRoom(roomId);
  if (room.qInterval) return;

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
    startQuestionLoop(roomId);
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
      if (t.players.some(p => p.id === socket.id)) {
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
    } else {
      socket.emit('answerWrong');
    }
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

module.exports = io;
