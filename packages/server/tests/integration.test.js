const { spawn } = require("child_process");
const net = require("net");
const fs = require("fs");
const path = require("path");

const TEST_PORT = 63798;
const TEST_AOF_PATH = path.join(__dirname, "integration-test.aof");

class TestClient {
  constructor(port) {
    this.port = port;
    this.socket = new net.Socket();
    this.responseBuffer = Buffer.alloc(0); // Use a Buffer for reliable parsing
    this.resolveQueue = [];

    this.socket.on("data", (chunk) => {
      this.responseBuffer = Buffer.concat([this.responseBuffer, chunk]);
      while (this.resolveQueue.length > 0) {
        const crlfIndex = this.responseBuffer.indexOf("\r\n");
        if (crlfIndex === -1) break; // Incomplete message, wait for more data

        const firstByte = this.responseBuffer[0];
        let messageEnd = -1;

        // Handle simple strings, errors, and integers
        if (firstByte === 43 || firstByte === 45 || firstByte === 58) {
          // +, -, :
          messageEnd = crlfIndex + 2;
        }
        // Handle bulk strings
        else if (firstByte === 36) {
          // $
          const length = parseInt(
            this.responseBuffer.slice(1, crlfIndex).toString(),
            10
          );
          if (length === -1) {
            messageEnd = crlfIndex + 2; // Null bulk string "$-1\r\n"
          } else {
            const totalLength = crlfIndex + 2 + length + 2;
            if (this.responseBuffer.length >= totalLength) {
              messageEnd = totalLength;
            }
          }
        }

        if (messageEnd !== -1) {
          const response = this.responseBuffer.slice(0, messageEnd);
          this.responseBuffer = this.responseBuffer.slice(messageEnd);
          this.resolveQueue.shift()(response.toString());
        } else {
          break; // Not enough data for a complete bulk string, wait for more
        }
      }
    });
  }

  connect() {
    return new Promise((resolve) =>
      this.socket.connect(this.port, "127.0.0.1", resolve)
    );
  }

  sendCommand(commandArray) {
    const respCommand =
      `*${commandArray.length}\r\n` +
      commandArray
        .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
        .join("");
    return new Promise((resolve, reject) => {
      this.resolveQueue.push(resolve);
      this.socket.write(respCommand, (err) => {
        if (err) {
          this.resolveQueue.pop();
          reject(err);
        }
      });
    });
  }

  disconnect() {
    this.socket.destroy();
  }
}

describe("JSRedis Server Integration Test", () => {
  jest.setTimeout(30000);

  let serverProcess;
  let client;

  const startServer = () => {
    return new Promise((resolve) => {
      serverProcess = spawn("node", ["src/index.js"], {
        cwd: path.join(__dirname, ".."),
        env: {
          ...process.env,
          PORT: TEST_PORT,
          WS_PORT: 8099,
          AOF_FILE_PATH: TEST_AOF_PATH,
        },
      });
      serverProcess.stdout.on("data", (data) => {
        if (data.toString().includes(`running on port ${TEST_PORT}`)) {
          resolve(serverProcess);
        }
      });
      serverProcess.stderr.on("data", (data) =>
        console.error(`[SERVER ERR]: ${data}`)
      );
    });
  };

  beforeEach(async () => {
    await startServer();
    client = new TestClient(TEST_PORT);
    await client.connect();
  });

  afterEach(() => {
    if (client) client.disconnect();
    if (serverProcess) serverProcess.kill();
    if (fs.existsSync(TEST_AOF_PATH)) {
      fs.unlinkSync(TEST_AOF_PATH);
    }
  });

  it("should handle a basic SET, GET, DEL sequence", async () => {
    const setResponse = await client.sendCommand(["SET", "mykey", "myvalue"]);
    expect(setResponse).toBe("+OK\r\n");

    const getResponse = await client.sendCommand(["GET", "mykey"]);
    expect(getResponse).toBe("$7\r\nmyvalue\r\n");

    const delResponse = await client.sendCommand(["DEL", "mykey"]);
    expect(delResponse).toBe(":1\r\n");

    const getAgainResponse = await client.sendCommand(["GET", "mykey"]);
    expect(getAgainResponse).toBe("$-1\r\n");
  });

  it("should persist data across a restart", async () => {
    await client.sendCommand(["SET", "persist_key", "it_works"]);
    const getResponse1 = await client.sendCommand(["GET", "persist_key"]);
    expect(getResponse1).toBe("$8\r\nit_works\r\n");

    client.disconnect();
    serverProcess.kill();
    await new Promise((res) => setTimeout(res, 500));

    await startServer();
    client = new TestClient(TEST_PORT);
    await client.connect();

    const getResponse2 = await client.sendCommand(["GET", "persist_key"]);
    expect(getResponse2).toBe("$8\r\nit_works\r\n");
  });
});
