import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, STRATEGIES, TIMEOUTS, THEME_TRANSITION } from "../../config";

describe("STRATEGIES", () => {
  it("contains at least one entry", () => {
    expect(STRATEGIES.length).toBeGreaterThan(0);
  });

  it("has exactly one 'auto' sentinel at index 0", () => {
    const autos = STRATEGIES.filter(s => s.value === "auto");
    expect(autos).toHaveLength(1);
    expect(STRATEGIES[0].value).toBe("auto");
  });

  it("every entry has a non-empty label and value", () => {
    for (const s of STRATEGIES) {
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.value).toBe("string");
      expect(s.value.length).toBeGreaterThan(0);
    }
  });

  it("non-auto values all end with .bat", () => {
    const nonAuto = STRATEGIES.filter(s => s.value !== "auto");
    for (const s of nonAuto) {
      expect(s.value).toMatch(/\.bat$/);
    }
  });

  it("has no duplicate values", () => {
    const values = STRATEGIES.map(s => s.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("STORAGE_KEYS", () => {
  it("has no duplicate values", () => {
    const vals = Object.values(STORAGE_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });

  it("all values are non-empty strings", () => {
    for (const v of Object.values(STORAGE_KEYS)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });
});

describe("TIMEOUTS", () => {
  it("all values are positive numbers", () => {
    for (const v of Object.values(TIMEOUTS)) {
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe("THEME_TRANSITION", () => {
  it("REVEAL_MS and FADE_MS are positive", () => {
    expect(THEME_TRANSITION.REVEAL_MS).toBeGreaterThan(0);
    expect(THEME_TRANSITION.FADE_MS).toBeGreaterThan(0);
  });
});
