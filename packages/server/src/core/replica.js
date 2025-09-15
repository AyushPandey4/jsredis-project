const net = require("net");
const { RESPParser } = require("../resp/parser");
const { executeCommand } = require("../commands/handlers");
const store = require("../core/store");
const { serializeBulkString } = require("../resp/serializer");

// Replicas will have their own port, defaulting to 6380
const REPLICA_PORT = process.env.PORT || 6380;

function connectToMaster(host, port) {
  const socket = new net.Socket();
  const parser = new RESPParser((commandArray) => {
    // Execute command received from master. The 'true' flag prevents propagation.
    executeCommand(commandArray, true);
  });

  // The port we connect to is the master's MAIN port + 1
  const replicationPort = port + 1;

  socket.connect(replicationPort, host, () => {
    console.log(
      `[Replica] Connected to master at ${host}:${replicationPort}. Ready for command stream.`
    );
  });

  socket.on("data", (chunk) => {
    parser.feed(chunk);
  });

  socket.on("close", () => {
    console.log(
      "[Replica] Connection to master closed. Attempting to reconnect in 2s..."
    );
    setTimeout(() => connectToMaster(host, port), 2000);
  });

  socket.on("error", (err) => {
    console.error(
      `[Replica] Connection error: ${err.message}. Retrying in 2s...`
    );
    socket.destroy(); // Ensure socket is cleaned up before retry
  });
}

// Replicas can also serve read-only commands
function startReplicaReadOnlyServer() {
  const server = net.createServer((socket) => {
    const parser = new RESPParser((commandArray) => {
      const commandName = commandArray[0].toUpperCase();
      // Replicas only allow read commands
      if (commandName === "GET" || commandName === "KEYS") {
        const response = executeCommand(commandArray);
        socket.write(response);
      } else {
        socket.write("-ERR Replica is read-only\r\n");
      }
    });
    socket.on("data", (chunk) => parser.feed(chunk));
  });

  server.listen(REPLICA_PORT, "127.0.0.1", () => {
    console.log(`Replica read-only server listening on port ${REPLICA_PORT}`);
  });
}

function startReplica(masterHost, masterPort) {
  connectToMaster(masterHost, masterPort);
  startReplicaReadOnlyServer();
}

module.exports = { startReplica };
