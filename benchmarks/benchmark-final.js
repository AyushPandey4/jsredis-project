const { spawn } = require("child_process");
const net = require("net");
const hdr = require("hdr-histogram-js");

// --- Configuration ---
const BENCH_PORT = 63799;
const CONCURRENCY = 50; // Reduced concurrency for more stable testing
const DURATION_S = 10;

// --- Main Runner ---
async function main() {
  let serverProcess;
  try {
    console.log("--- JSRedis Benchmark ---");
    console.log("Starting server process...");
    serverProcess = spawn("node", ["packages/server/src/index.js"], {
      env: {
        ...process.env,
        PORT: BENCH_PORT,
        WS_PORT: 8089,
        AOF_FILE_PATH: "benchmark.aof",
      },
    });

    await waitForServer(serverProcess);

    console.log("\n--- Running SET Benchmark ---");
    const setStats = await runBenchmark([
      "SET",
      "mykey",
      `value-${"x".repeat(100)}`,
    ]);
    printStats("SET", setStats);

    console.log("\n--- Running GET Benchmark ---");
    const getStats = await runBenchmark(["GET", "mykey"]);
    printStats("GET", getStats);
  } catch (error) {
    console.error("\n--- BENCHMARK FAILED ---");
    console.error(error);
  } finally {
    if (serverProcess) serverProcess.kill();
    console.log("\n--- Benchmark Finished ---");
  }
}

// --- Benchmark Runner ---
function runBenchmark(command) {
  return new Promise((resolve) => {
    let totalRequests = 0;
    const histogram = hdr.build();
    let activeClients = CONCURRENCY;

    const onTestEnd = () => {
      activeClients--;
      if (activeClients === 0) {
        resolve({ totalRequests, histogram });
      }
    };

    // Start N concurrent workers
    for (let i = 0; i < CONCURRENCY; i++) {
      runWorker(command, histogram).then((reqCount) => {
        totalRequests += reqCount;
        onTestEnd();
      });
    }
  });
}

// --- A single worker that connects and runs commands in a loop ---
async function runWorker(command, histogram) {
  const client = new net.Socket();
  await new Promise((resolve) =>
    client.connect(BENCH_PORT, "127.0.0.1", resolve)
  );

  let requestCount = 0;
  const testEndTime = Date.now() + DURATION_S * 1000;

  while (Date.now() < testEndTime) {
    const start = process.hrtime.bigint();
    await sendAndReceive(client, command);
    const end = process.hrtime.bigint();
    histogram.recordValue(Number(end - start) / 1000); // Record in microseconds
    requestCount++;
  }

  client.destroy();
  return requestCount;
}

// ---  Request/Response Helper ---
function sendAndReceive(client, command) {
  return new Promise((resolve, reject) => {
    const respCommand =
      `*${command.length}\r\n` +
      command.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join("");

    const onData = (data) => {
      client.removeListener("data", onData);
      resolve(data);
    };
    client.on("data", onData);
    client.write(respCommand, (err) => {
      if (err) reject(err);
    });
  });
}

// ---  Server Ready Checker ---
function waitForServer(serverProcess) {
  console.log("[Waiting for server to be ready...]");
  return new Promise((resolve, reject) => {
    serverProcess.stdout.on("data", (data) => {
      // This is the log message from our server.js
      if (data.toString().includes(`running on port ${BENCH_PORT}`)) {
        console.log("[Server is ready!]");
        // Wait a brief moment for the OS to fully bind the port
        setTimeout(resolve, 500);
      }
    });
    serverProcess.stderr.on("data", (data) =>
      console.error(`[SERVER ERR]: ${data}`)
    );
    serverProcess.on("exit", (code) =>
      reject(`Server process exited with code ${code}`)
    );
  });
}

function printStats(name, stats) {
  if (stats.totalRequests === 0) {
    console.log(`Results for: ${name}`);
    console.log("No requests were completed.");
    return;
  }
  const rps = (stats.totalRequests / DURATION_S).toFixed(2);
  console.log(`Results for: ${name}`);
  console.log(`${stats.totalRequests} requests in ${DURATION_S}s`);
  console.log(`Requests/sec: ${rps}`);
  console.log("Latency Distribution (in milliseconds):");
  console.log(
    `  p50 (Median): ${(
      stats.histogram.getValueAtPercentile(50) / 1000
    ).toFixed(3)}`
  );
  console.log(
    `  p90:          ${(
      stats.histogram.getValueAtPercentile(90) / 1000
    ).toFixed(3)}`
  );
  console.log(
    `  p99:          ${(
      stats.histogram.getValueAtPercentile(99) / 1000
    ).toFixed(3)}`
  );
}

main();
