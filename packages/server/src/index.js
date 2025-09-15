// Read configuration from environment variables
const MAX_MEMORY = parseInt(process.env.MAX_MEMORY, 10) || 0;
require('./core/store').init(MAX_MEMORY);

// --- Role Selection based on Command-Line Arguments ---
const args = process.argv.slice(2);
const replicaOfIndex = args.indexOf('--replicaof');
const isReplica = replicaOfIndex !== -1;

if (isReplica) {
  // --- Start as Replica ---
  const [masterHost, masterPort] = args[replicaOfIndex + 1].split(' ');
  console.log(`Starting in REPLICA mode, will connect to master at ${masterHost}:${masterPort}`);
  require('./core/replica').startReplica(masterHost, parseInt(masterPort, 10));

} else {
  // --- Start as Master ---
  console.log('Starting in MASTER mode');
  const { start: startTcpServer } = require('./server');
  const { start: startWsServer } = require('./ws-server');
  const { startBroadcasting } = require('./core/metrics');

  startTcpServer();
  startWsServer();
  startBroadcasting();
}