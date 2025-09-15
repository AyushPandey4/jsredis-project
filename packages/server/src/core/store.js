// A simple Node for our Doubly-Linked List
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class Store {
  constructor() {
    this.data = new Map();
    this.ttls = new Map();

    // LRU Cache properties
    this.maxMemory = 0; // in bytes
    this.currentMemory = 0;
    this.lruHead = null;
    this.lruTail = null;
  }

  // New init method for configuration
  init(maxMemory) {
    this.maxMemory = maxMemory;
    console.log(
      `Max memory set to: ${
        this.maxMemory > 0
          ? (this.maxMemory / 1024 / 1024).toFixed(2) + "MB"
          : "unlimited"
      }`
    );
  }

  _getMemoryUsage(key, value) {
    // A simple estimation of memory usage in bytes
    return Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
  }

  _moveToHead(node) {
    if (node === this.lruHead) return;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.lruTail) this.lruTail = node.prev;

    node.prev = null;
    node.next = this.lruHead;
    if (this.lruHead) this.lruHead.prev = node;
    this.lruHead = node;
    if (!this.lruTail) this.lruTail = node;
  }

  _evict() {
    if (!this.lruTail) return;

    console.log(
      `[Eviction] Memory limit reached. Evicting key: ${this.lruTail.key}`
    );
    const keyToEvict = this.lruTail.key;
    this.del(keyToEvict); // del is updated to handle memory and LRU list
  }

  set(key, value) {
    this.ttls.delete(key);

    const memoryDelta = this._getMemoryUsage(key, value);
    let existingNode = this.data.get(key);

    if (existingNode) {
      // Update existing key
      this.currentMemory -= this._getMemoryUsage(key, existingNode.value);
      existingNode.value = value;
      this._moveToHead(existingNode);
    } else {
      // Add new key
      existingNode = new Node(key, value);
      this.data.set(key, existingNode);
      this._moveToHead(existingNode);
    }

    this.currentMemory += memoryDelta;

    // Enforce memory limit if configured
    if (this.maxMemory > 0) {
      while (this.currentMemory > this.maxMemory) {
        this._evict();
      }
    }
  }

  get(key) {
    if (this.isExpired(key)) {
      this.del(key);
      return null;
    }

    const node = this.data.get(key);
    if (node) {
      // On access, move to the front of the LRU list
      this._moveToHead(node);
      return node.value;
    }
    return null;
  }

  del(key) {
    this.ttls.delete(key);
    const node = this.data.get(key);

    if (node) {
      // Remove from LRU list
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (node === this.lruHead) this.lruHead = node.next;
      if (node === this.lruTail) this.lruTail = node.prev;

      // Update memory
      this.currentMemory -= this._getMemoryUsage(key, node.value);
      this.data.delete(key);
      return 1;
    }
    return 0;
  }

  /**
   * Sets a Time-To-Live (TTL) for a key.
   * @param {string} key
   * @param {number} ms - The TTL in milliseconds.
   */
  setExpiry(key, ms) {
    if (this.data.has(key)) {
      const expiryTime = Date.now() + ms;
      this.ttls.set(key, expiryTime);
      return 1;
    }
    return 0;
  }

  /**
   * Gets the remaining TTL for a key in seconds.
   */
  getTtl(key) {
    if (!this.ttls.has(key)) {
      return -1; // No TTL set
    }

    if (this.isExpired(key)) {
      this.del(key);
      return -2; // Expired
    }

    const expiryTime = this.ttls.get(key);
    const remainingMs = expiryTime - Date.now();
    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Checks if a key is expired. Does not delete it.
   */
  isExpired(key) {
    if (!this.ttls.has(key)) {
      return false;
    }
    const expiryTime = this.ttls.get(key);
    return Date.now() > expiryTime;
  }

  /**
   * Deletes all keys from the database.
   */
  flushAll() {
    this.data.clear();
    this.ttls.clear();
    this.currentMemory = 0;
    this.lruHead = null;
    this.lruTail = null;
  }
}

const storeInstance = new Store();
module.exports = storeInstance;
module.exports.Store = Store; // Also export the class on a named property
