const { Store } = require("../../src/core/store");

describe("Store", () => {
  let store;

  beforeEach(() => {
    store = new Store();
    store.init(0); // Initialize with no memory limit for these tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should set and get a value", () => {
    store.set("key", "value");
    expect(store.get("key")).toBe("value");
  });

  it("get should return null for a non-existent key", () => {
    expect(store.get("nonexistent")).toBeNull();
  });

  it("del should remove a key", () => {
    store.set("key", "value");
    expect(store.del("key")).toBe(1);
    expect(store.get("key")).toBeNull();
  });

  it("del should return 0 for a non-existent key", () => {
    expect(store.del("nonexistent")).toBe(0);
  });

  it("should set an expiry and respect it", () => {
    store.set("key", "value");
    store.setExpiry("key", 1000); // 1 second expiry
    expect(store.get("key")).toBe("value");
    jest.advanceTimersByTime(1001);
    expect(store.get("key")).toBeNull();
  });

  it("ttl should return remaining time for a key with expiry", () => {
    store.set("key", "value");
    store.setExpiry("key", 5000); // 5 seconds expiry
    expect(store.getTtl("key")).toBe(5);
    jest.advanceTimersByTime(2000);
    expect(store.getTtl("key")).toBe(3);
  });

  it("ttl should return -1 for a key without expiry", () => {
    store.set("key", "value");
    expect(store.getTtl("key")).toBe(-1);
  });

  it("ttl should return -2 for an expired key", () => {
    store.set("key", "value");
    store.setExpiry("key", 1000);
    jest.advanceTimersByTime(1001);
    expect(store.getTtl("key")).toBe(-2);
  });
});
