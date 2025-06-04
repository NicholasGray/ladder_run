# Setup Instructions

This document describes how to run the Phaser game contained in this repository.

## Prerequisites

- [Node.js](https://nodejs.org/) version 18 or later
- `npm` (usually installed with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd ladder_run
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

### Using the provided start script

If your project contains a `server.js` file that serves the contents of the
`public/` directory, you can launch the game with:

```bash
npm start
```

The server should listen on port `8080`. Once running, open
[http://localhost:8080/public](http://localhost:8080/public) in your browser.

### Using `http-server`

If the `server.js` file is missing or you simply want to serve the static files
directly, you can use the bundled `http-server` package:

```bash
npx http-server -p 8080
```

Then navigate to
[http://localhost:8080/public](http://localhost:8080/public).

## Development Mode

During development you can use `nodemon` (installed as a dev dependency) to
reload the server when files change:

```bash
npm run dev
```

## Notes

- The project depends on Phaser, Express and Socket.IO as listed in
  `package.json`.
- No automated tests are defined.
