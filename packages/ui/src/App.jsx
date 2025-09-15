import { useState, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Terminal } from "./components/Terminal";
import { KeyBrowser } from "./components/KeyBrowser";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { MetricsPanel } from "./components/MetricsPanel";

const MAX_HISTORY_LENGTH = 30; // Keep 30 data points for the chart

function App() {
  const { status, connect, disconnect, sendMessage, lastMessage } =
    useWebSocket();
  const [terminalResponse, setTerminalResponse] = useState(null);
  const [keys, setKeys] = useState([]);
  const [metrics, setMetrics] = useState({
    memory: { heapUsed: 0 },
    clients: { tcp: 0, ws: 0 },
    tps: 0,
  });
  const [metricsHistory, setMetricsHistory] = useState([]);

  const defaultHost = import.meta.env.VITE_SERVER_HOST;
  const defaultPort = import.meta.env.VITE_SERVER_PORT;

  // Handles all incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "response") {
      setTerminalResponse(lastMessage.payload);
    } else if (lastMessage.type === "event") {
      switch (lastMessage.event) {
        case "keys-initial":
          setKeys(lastMessage.payload);
          break;
        case "keyspace-update":
          sendMessage({ type: "subscribe", channel: "keyspace" });
          break;
        case "metrics-update":
          const newMetrics = lastMessage.payload;
          setMetrics(newMetrics);
          // Add new data point to history for the chart
          setMetricsHistory((prev) => {
            const newPoint = {
              time: new Date(newMetrics.timestamp).toLocaleTimeString(),
              tps: parseFloat(newMetrics.tps),
              memory: parseFloat(newMetrics.memory.heapUsed),
            };
            // Keep the history array from growing indefinitely
            return [...prev, newPoint].slice(-MAX_HISTORY_LENGTH);
          });
          break;
        default:
          break;
      }
    }
  }, [lastMessage, sendMessage]);

  // Runs once on connection
  useEffect(() => {
    if (status === "connected") {
      sendMessage({ type: "subscribe", channel: "keyspace" });
    } else {
      // Clear data when disconnected
      setKeys([]);
      setMetricsHistory([]);
      setMetrics({
        memory: { heapUsed: 0 },
        clients: { tcp: 0, ws: 0 },
        tps: 0,
      });
    }
  }, [status, sendMessage]);

  const sendTerminalCommand = (commandString) => {
    sendMessage({ type: "command", payload: commandString });
  };

  const handleKeyClick = (key) => {
    sendTerminalCommand(`GET "${key}"`);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-mono">
      <ConnectionPanel
        status={status}
        onConnect={connect}
        onDisconnect={disconnect}
        defaultHost={defaultHost}
        defaultPort={defaultPort}
      />

      {status === "connected" ? (
        <main className="flex-grow flex p-4 gap-4 overflow-hidden">
          <div className="w-2/3 flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-gray-300">
              Interactive Terminal
            </h2>
            <div className="flex-grow bg-[#1a1b26] p-2 rounded-md">
              <Terminal
                sendMessage={sendTerminalCommand}
                lastMessage={terminalResponse}
              />
            </div>
          </div>
          <div className="w-1/3 flex flex-col gap-4">
            <div className="flex-grow bg-gray-800 rounded-md p-4 flex flex-col min-h-0">
              <KeyBrowser keys={keys} onKeyClick={handleKeyClick} />
            </div>
            <div className="h-1/2 bg-gray-800 rounded-md p-4 flex flex-col">
              <MetricsPanel metrics={metrics} history={metricsHistory} />
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500 text-xl">
          <p>Please connect to a JSRedis server to begin.</p>
        </div>
      )}
    </div>
  );
}

export default App;
