const net = require("net");
const fs = require("fs");
const emitter = require("./core/emitter");
const { RESPParser } = require("./resp/parser");
const { executeCommand } = require("./commands/handlers");
const aof = require("./core/aof");

const replicaSockets = new Set();
const PORT = parseInt(process.env.PORT, 10) || 63790;
const REPLICATION_PORT = PORT + 1; // Dedicated port for replicas

emitter.on("propagate", (respCommand) => {
  for (const replicaSocket of replicaSockets) {
    replicaSocket.write(respCommand);
  }
});

function start() {
  // Load data from the AOF file BEFORE starting any servers.
  aof.load(executeCommand);

  // --- Server 1: For Regular Clients ---
  const server = net.createServer((socket) => {
    console.log(
      `Client connected on main port from: ${socket.remoteAddress}:${socket.remotePort}`
    );

    const parser = new RESPParser((commandArray) => {
      const response = executeCommand(commandArray);
      if (response) {
        socket.write(response);
      }
    });

    socket.on("data", (chunk) => {
      try {
        parser.feed(chunk);
      } catch (err) {
        console.error("Bad command:", err.message);
        socket.write(`-ERR ${err.message}\r\n`);
      }
    });

    socket.on("close", () => {
      console.log(
        `Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`
      );
      server.getConnections((err, count) => {
        if (!err) emitter.emit("tcp-client-change", count);
      });
    });

    socket.on("error", (err) => {
      console.error(`Socket error from client: ${err.message}`);
    });

    server.getConnections((err, count) => {
      if (!err) emitter.emit("tcp-client-change", count);
    });
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`JSRedis Master TCP server is running on port ${PORT}`);
  });

  // --- Server 2: For Replicas ---
  const replicationServer = net.createServer((socket) => {
    console.log(
      `Replica connected on replication port from: ${socket.remoteAddress}:${socket.remotePort}`
    );
    replicaSockets.add(socket);

    try {
      const aofContent = fs.readFileSync(aof.filePath);
      if (aofContent.length > 0) {
        socket.write(aofContent);
      }
      console.log("Finished streaming AOF to new replica.");
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.error("Error reading AOF for replica sync:", e);
      }
    }

    socket.on("close", () => {
      console.log(
        `Replica disconnected: ${socket.remoteAddress}:${socket.remotePort}`
      );
      replicaSockets.delete(socket);
    });
    socket.on("error", (err) => {
      console.error(`Socket error from replica: ${err.message}`);
      replicaSockets.delete(socket);
    });
  });

  replicationServer.listen(REPLICATION_PORT, "127.0.0.1", () => {
    console.log(
      `JSRedis Replication server is running on port ${REPLICATION_PORT}`
    );
  });
}

module.exports = { start };
