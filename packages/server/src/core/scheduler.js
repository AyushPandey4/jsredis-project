// We need the store instance to access the TTLs and data
const { store } = require('../commands/handlers');

// --- Configuration ---
const SWEEP_INTERVAL_MS = 100; // How often the scheduler runs
const SAMPLE_SIZE = 20;        // How many keys to check per run

/**
 * The core function for finding and deleting expired keys.
 * This is a simplified version of the Redis active expiration algorithm.
 */
function evictExpiredKeys() {
  const keysWithTtls = Array.from(store.ttls.keys());
  const sampleSize = Math.min(keysWithTtls.length, SAMPLE_SIZE);

  if (sampleSize === 0) {
    return; // Nothing to do
  }

  // Select a random sample of keys to check
  for (let i = 0; i < sampleSize; i++) {
    const randomIndex = Math.floor(Math.random() * keysWithTtls.length);
    const key = keysWithTtls[randomIndex];

    // The isExpired method checks the TTL. If expired, we delete it.
    // This is a great example of reusing existing logic.
    if (store.isExpired(key)) {
      console.log(`[Scheduler] Evicted expired key: ${key}`);
      store.del(key);
    }
  }
}

/**
 * Starts the background scheduler.
 */
function start() {
  console.log('Starting background TTL scheduler...');
  setInterval(evictExpiredKeys, SWEEP_INTERVAL_MS);
}

module.exports = { start };