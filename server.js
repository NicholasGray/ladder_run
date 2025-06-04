const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Serve static files from public directory
app.use(express.static('public'));

// Attach Socket.IO with no CORS restrictions for development
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

module.exports = io;
