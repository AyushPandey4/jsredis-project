const { RESPParser } = require('../../src/resp/parser');

describe('RESPParser', () => {
  let parser;
  let commandsReceived;

  // Before each test, create a new parser and an array to store received commands
  beforeEach(() => {
    commandsReceived = [];
    parser = new RESPParser((command) => {
      commandsReceived.push(command);
    });
  });

  test('should parse a simple, complete command', () => {
    const command = Buffer.from('*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n');
    parser.feed(command);

    expect(commandsReceived.length).toBe(1);
    expect(commandsReceived[0]).toEqual(['GET', 'key']);
  });

  test('should not parse an incomplete command', () => {
    // Missing the final CRLF
    const partialCommand = Buffer.from('*2\r\n$3\r\nGET\r\n$3\r\nkey');
    parser.feed(partialCommand);

    expect(commandsReceived.length).toBe(0);
  });

  test('should parse a command split across multiple chunks', () => {
    const chunk1 = Buffer.from('*2\r\n$3\r\nGET\r\n');
    const chunk2 = Buffer.from('$3\r\nkey\r\n');

    parser.feed(chunk1);
    expect(commandsReceived.length).toBe(0); // No command yet

    parser.feed(chunk2);
    expect(commandsReceived.length).toBe(1);
    expect(commandsReceived[0]).toEqual(['GET', 'key']);
  });

  test('should parse multiple pipelined commands in a single chunk', () => {
    const pipelined = Buffer.from(
      '*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n'
    );

    parser.feed(pipelined);

    expect(commandsReceived.length).toBe(2);
    expect(commandsReceived[0]).toEqual(['GET', 'key']);
    expect(commandsReceived[1]).toEqual(['SET', 'foo', 'bar']);
  });

  test('should handle remaining partial command in buffer after parsing a full one', () => {
    const chunk = Buffer.from(
      '*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n*3\r\n$3\r\nSET\r\n$3\r\n' // Partial second command
    );
    parser.feed(chunk);

    // Should have parsed the first command
    expect(commandsReceived.length).toBe(1);
    expect(commandsReceived[0]).toEqual(['GET', 'key']);

    // Now feed the rest of the second command
    const remainingChunk = Buffer.from('foo\r\n$3\r\nbar\r\n');
    parser.feed(remainingChunk);

    expect(commandsReceived.length).toBe(2);
    expect(commandsReceived[1]).toEqual(['SET', 'foo', 'bar']);
  });
});