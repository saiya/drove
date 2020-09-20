import { OnMemoryCache } from "./index";

const owner = Symbol("test-owner");

describe("LocalCache", async () => {
  it("Should cache", async () => {
    const cache = new OnMemoryCache();

    expect(await cache.get(owner, "the-key", async () => 1)).toBe(1);
    expect(await cache.get(owner, "the-key", async () => 2)).toBe(1); // Cached
  });
  it("Invalidate should invalidate single key", async () => {
    const cache = new OnMemoryCache();

    expect(await cache.get(owner, "the-key", async () => 1)).toBe(1);
    expect(await cache.get(owner, "the-key", async () => 2)).toBe(1); // Cached
    expect(await cache.get(owner, "another-key", async () => 1)).toBe(1);
    expect(await cache.get(owner, "another-key", async () => 2)).toBe(1); // Cached

    cache.invalidate(owner, "the-key");

    expect(await cache.get(owner, "the-key", async () => 2)).toBe(2);
    expect(await cache.get(owner, "another-key", async () => 2)).toBe(1); // Cached
  });
  it("invalidateAll should invalidate all keys of the owner", async () => {
    const cache = new OnMemoryCache();
    const anotherOwner = Symbol("test-owner-another");

    expect(await cache.get(owner, "the-key", async () => 1)).toBe(1);
    expect(await cache.get(owner, "the-key", async () => 2)).toBe(1); // Cached
    expect(await cache.get(owner, "another-key", async () => 1)).toBe(1);
    expect(await cache.get(owner, "another-key", async () => 2)).toBe(1); // Cached
    expect(await cache.get(anotherOwner, "more-key", async () => "val1")).toBe("val1");
    expect(await cache.get(anotherOwner, "more-key", async () => "val2")).toBe("val1"); // Cached

    cache.invalidateByOwner(owner);

    expect(await cache.get(owner, "the-key", async () => 2)).toBe(2);
    expect(await cache.get(owner, "another-key", async () => 2)).toBe(2);
    expect(await cache.get(anotherOwner, "more-key", async () => "val2")).toBe("val1"); // Cached
  });
});
