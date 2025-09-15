const { WebSocketServer } = require("ws");
const { executeCommand, store } = require("./commands/handlers");
const emitter = require("./core/emitter");

const WS_PORT = process.env.WS_PORT || 8080;
const subscribedClients = new Set();

function broadcast(message) {
  for (const client of subscribedClients) {
    client.send(JSON.stringify(message));
  }
}
// Listen for the metrics update
emitter.on("metrics-update", (metrics) => {
  broadcast({
    type: "event",
    event: "metrics-update",
    payload: metrics,
  });
});

emitter.on("write", (data) => {
  broadcast({
    type: "event",
    event: "keyspace-update",
    payload: { command: data.command, key: data.args[0] },
  });
});

function start() {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("listening", () => {
    console.log(`WebSocket bridge is running on ws://localhost:${WS_PORT}`);
  });

  wss.on("connection", (ws) => {
    console.log("UI client connected via WebSocket");
    emitter.emit("ws-client-change", wss.clients.size); // Emit new count on connect

    ws.on("error", console.error);

    ws.on("message", (message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "response",
            payload: "-ERR Invalid JSON format\r\n",
          })
        );
        return;
      }

      // Handle all message types based on the 'type' property
      switch (data.type) {
        case "subscribe":
          if (data.channel === "keyspace") {
            console.log("Client subscribed to keyspace updates");
            subscribedClients.add(ws);
            ws.send(
              JSON.stringify({
                type: "event",
                event: "keys-initial",
                payload: [...store.data.keys()],
              })
            );
          }
          break;
        case "command":
          const commandArray = data.payload.trim().split(" ");
          const response = executeCommand(commandArray);
          // ALWAYS wrap the RESP response in our JSON protocol
          ws.send(JSON.stringify({ type: "response", payload: response }));
          break;
        default:
          ws.send(
            JSON.stringify({
              type: "response",
              payload: "-ERR Unknown message type\r\n",
            })
          );
      }
    });

    ws.on("close", () => {
      console.log("UI client disconnected");
      subscribedClients.delete(ws);
      emitter.emit("ws-client-change", wss.clients.size); // Emit new count on disconnect
    });
  });
}

module.exports = { start };
