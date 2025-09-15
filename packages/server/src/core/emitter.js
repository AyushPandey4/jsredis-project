const EventEmitter = require("events");

// Create and export a single, shared instance of the event emitter.
const emitter = new EventEmitter();

module.exports = emitter;
