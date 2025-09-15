const store = require('../core/store');
const aof = require('../core/aof');
const emitter = require('../core/emitter');
const {
  serializeSimpleString,
  serializeBulkString,
  serializeNull,
  serializeError,
  serializeInteger,
  serializeArray
} = require('../resp/serializer');

// This file no longer needs to know about the server or replica sockets.

const WRITE_COMMANDS = new Set(['SET', 'DEL', 'EXPIRE', 'FLUSHALL']);

// The command handlers object (no changes needed inside)
const commandHandlers = {
  PING: (args) => {
    return args.length === 0
      ? serializeSimpleString("PONG")
      : serializeBulkString(args[0]);
  },
  ECHO: (args) => {
    if (args.length !== 1)
      return serializeError("ERR wrong number of arguments for 'echo' command");
    return serializeBulkString(args[0]);
  },
  SET: (args) => {
    if (args.length < 2)
      return serializeError("ERR wrong number of arguments for 'set' command");
    const [key, value, ...options] = args;

    let expiry = null;
    if (options.length > 0) {
      if (options[0].toUpperCase() === "EX" && options[1]) {
        expiry = parseInt(options[1], 10) * 1000;
      }
    }

    store.set(key, value);
    if (expiry !== null) {
      store.setExpiry(key, expiry);
    }

    return serializeSimpleString("OK");
  },
  GET: (args) => {
    if (args.length !== 1)
      return serializeError("ERR wrong number of arguments for 'get' command");
    const value = store.get(args[0]);
    return value === null ? serializeNull() : serializeBulkString(value);
  },
  DEL: (args) => {
    if (args.length === 0)
      return serializeError("ERR wrong number of arguments for 'del' command");
    let deletedCount = 0;
    for (const key of args) {
      deletedCount += store.del(key);
    }
    return serializeInteger(deletedCount);
  },
  EXPIRE: (args) => {
    if (args.length !== 2)
      return serializeError(
        "ERR wrong number of arguments for 'expire' command"
      );
    const [key, seconds] = args;
    const ms = parseInt(seconds, 10) * 1000;
    const result = store.setExpiry(key, ms);
    return serializeInteger(result);
  },
  TTL: (args) => {
    if (args.length !== 1)
      return serializeError("ERR wrong number of arguments for 'ttl' command");
    const ttl = store.getTtl(args[0]);
    return serializeInteger(ttl);
  },
  KEYS: (args) => {
    if (args.length !== 1 || args[0] !== "*")
      return serializeError(
        "ERR syntax error. Only 'KEYS *' is supported for this MVP."
      );
    // For LRU, store.data now holds Node objects, so we get keys differently
    const allKeys = [...store.data.keys()].filter(
      (key) => !store.isExpired(key)
    );
    return serializeArray(allKeys);
  },
  FLUSHALL: (args) => {
    store.flushAll();
    return serializeSimpleString("OK");
  },
};

function executeCommand(commandArray, fromMaster = false) {
  emitter.emit('command');
  const commandName = commandArray[0].toUpperCase();
  const args = commandArray.slice(1);
  
  const handler = commandHandlers[commandName];
  if (handler) {
    const response = handler(args);

    if (WRITE_COMMANDS.has(commandName) && !fromMaster) {
      const respCommand = serializeArray(commandArray);
      
      // Instead of sending to sockets here, we emit an event.
      // The server will listen for this and handle the propagation.
      emitter.emit('propagate', respCommand);
      
      aof.write(commandArray);
      emitter.emit('write', { command: commandName, args });
    }
    
    return response;
  } else {
    return serializeError(`ERR unknown command '${commandName}'`);
  }
}

module.exports = { executeCommand, store };