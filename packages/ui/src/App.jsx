import { useState, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Terminal } from "./components/Terminal";
import { KeyBrowser } from "./components/KeyBrowser";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { MetricsPanel } from "./components/MetricsPanel";

const MAX_HISTORY_LENGTH = 30;

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

  const defaultUrl = import.meta.env.VITE_WS_URL;

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
          setMetricsHistory((prev) => {
            const newPoint = {
              time: new Date(newMetrics.timestamp).toLocaleTimeString(),
              tps: parseFloat(newMetrics.tps),
              memory: parseFloat(newMetrics.memory.heapUsed),
            };
            return [...prev, newPoint].slice(-MAX_HISTORY_LENGTH);
          });
          break;
        default:
          break;
      }
    }
  }, [lastMessage, sendMessage]);

  useEffect(() => {
    if (status === "connected") {
      sendMessage({ type: "subscribe", channel: "keyspace" });
    } else {
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
    <div className="h-screen flex flex-col font-mono">
      <header className="flex-shrink-0">
        <ConnectionPanel
          status={status}
          onConnect={connect}
          onDisconnect={disconnect}
          defaultUrl={defaultUrl}
        />
      </header>

      {status === "connected" ? (
        <main className="flex-grow flex flex-col lg:flex-row p-4 gap-4 overflow-y-auto">
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="flex-grow flex flex-col bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
              <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider p-3 border-b border-slate-700 bg-slate-900/50">
                Interactive Terminal
              </h2>
              <div className="flex-grow p-2">
                <Terminal
                  sendMessage={sendTerminalCommand}
                  lastMessage={terminalResponse}
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 flex flex-col min-h-0 h-1/2">
              <KeyBrowser keys={keys} onKeyClick={handleKeyClick} />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 flex flex-col h-1/2">
              <MetricsPanel metrics={metrics} history={metricsHistory} />
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 11a1 1 0 112 0m-1 6a1 1 0 100-2 1 1 0 000 2z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.883 12.036l.006.007a2.121 2.121 0 01-2.993 3.017l-4.578-4.578a2.121 2.121 0 010-2.993l4.578-4.578a2.121 2.121 0 113.006 2.993zM3.116 12.036l.007.007a2.121 2.121 0 002.993 3.017l4.578-4.578a2.121 2.121 0 000-2.993l-4.578-4.578a2.121 2.121 0 10-3.006 2.993z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-slate-400">
            Connection Required
          </h2>
          <p className="mt-1 text-slate-600">
            Please use the panel above to connect to a JSRedis server.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
