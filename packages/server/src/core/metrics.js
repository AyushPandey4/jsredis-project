const emitter = require('./emitter');

// --- State ---
let commandCount = 0;
let tcpClientCount = 0;
let wsClientCount = 0;
const BROADCAST_INTERVAL_MS = 2000; // Broadcast every 2 seconds

// --- Listen for events from other modules ---

// Listen for commands being executed
emitter.on('command', () => {
  commandCount++;
});

// Listen for TCP client connections/disconnections
emitter.on('tcp-client-change', (count) => {
  tcpClientCount = count;
});

// Listen for WebSocket client connections/disconnections
emitter.on('ws-client-change', (count) => {
  wsClientCount = count;
});


/**
 * Starts the periodic broadcasting of metrics.
 */
function startBroadcasting() {
  console.log('Starting metrics broadcaster...');
  
  setInterval(() => {
    // Calculate metrics
    const memoryUsage = process.memoryUsage();
    const tps = commandCount / (BROADCAST_INTERVAL_MS / 1000);
    
    const metrics = {
      memory: {
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2), // in MB
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2), // in MB
      },
      clients: {
        tcp: tcpClientCount,
        ws: wsClientCount,
      },
      tps: tps.toFixed(2),
      timestamp: Date.now(),
    };

    // Emit the update for the ws-server to broadcast
    emitter.emit('metrics-update', metrics);

    // Reset the command counter for the next interval
    commandCount = 0;

  }, BROADCAST_INTERVAL_MS);
}

module.exports = { startBroadcasting };