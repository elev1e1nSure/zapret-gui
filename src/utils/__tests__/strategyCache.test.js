import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStrategyCache,
  getLastWorkingStrategy,
  prioritizeCached,
  setLastWorkingStrategy,
} from "../strategyCache";

// ---------------------------------------------------------------------------
// localStorage mock (STORAGE_KEYS uses localStorage directly)
// ---------------------------------------------------------------------------
const store = {};
const localStorageMock = {
  getItem: vi.fn((k) => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = String(v); }),
  removeItem: vi.fn((k) => { delete store[k]; }),
};

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: false });

beforeEach(() => {
  // Clear the backing store and call counts before each test
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
});

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
describe("getLastWorkingStrategy", () => {
  it("returns null when nothing is cached", () => {
    expect(getLastWorkingStrategy()).toBeNull();
  });

  it("returns the cached value after setLastWorkingStrategy", () => {
    setLastWorkingStrategy("general_silent.bat");
    expect(getLastWorkingStrategy()).toBe("general_silent.bat");
  });

  it("ignores empty / falsy input in setLastWorkingStrategy", () => {
    setLastWorkingStrategy(null);
    setLastWorkingStrategy("");
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(getLastWorkingStrategy()).toBeNull();
  });
});

describe("clearStrategyCache", () => {
  it("returns true and removes the cached value", () => {
    setLastWorkingStrategy("general_silent.bat");
    expect(clearStrategyCache()).toBe(true);
    expect(getLastWorkingStrategy()).toBeNull();
  });

  it("returns true even when nothing was cached", () => {
    expect(clearStrategyCache()).toBe(true);
  });
});

describe("prioritizeCached", () => {
  it("returns the original list unchanged when nothing is cached", () => {
    const list = ["a", "b", "c"];
    expect(prioritizeCached(list)).toEqual(["a", "b", "c"]);
  });

  it("moves the cached strategy to the front", () => {
    setLastWorkingStrategy("b");
    expect(prioritizeCached(["a", "b", "c"])[0]).toBe("b");
  });

  it("does not duplicate the cached strategy", () => {
    setLastWorkingStrategy("b");
    const result = prioritizeCached(["a", "b", "c"]);
    expect(result).toHaveLength(3);
    expect(result.filter(s => s === "b")).toHaveLength(1);
  });

  it("ignores a cached value that is not in the list", () => {
    setLastWorkingStrategy("unknown");
    const list = ["a", "b", "c"];
    expect(prioritizeCached(list)).toEqual(list);
  });

  it("handles an empty strategy list", () => {
    setLastWorkingStrategy("a");
    expect(prioritizeCached([])).toEqual([]);
  });
});
