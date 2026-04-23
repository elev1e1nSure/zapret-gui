import { describe, expect, it } from "vitest";
import { humanizeError } from "../errors";

describe("humanizeError", () => {
  describe("structured errors from Tauri IPC ({ type, message })", () => {
    it("maps Process type to strategy-start message", () => {
      const err = { type: "Process", message: "Process error: Failed to start general_silent.bat: Access denied" };
      expect(humanizeError(err)).toContain("Не удалось запустить");
    });

    it("maps Path type to file-not-found message", () => {
      const err = { type: "Path", message: "Path error: Strategy not found" };
      expect(humanizeError(err)).toContain("не найдены");
    });

    it("returns .message as-is for unknown types (e.g. Network)", () => {
      const err = { type: "Network", message: "Ни одна стратегия не сработала" };
      expect(humanizeError(err)).toBe("Ни одна стратегия не сработала");
    });

    it("returns .message as-is for DiscoveryAborted type", () => {
      const err = { type: "DiscoveryAborted", message: "Search aborted" };
      expect(humanizeError(err)).toBe("Search aborted");
    });
  });

  describe("legacy plain-string fallback", () => {
    it("detects process errors by message heuristic", () => {
      expect(humanizeError("Failed to start foo.bat: error 5")).toContain("Не удалось запустить");
    });

    it("detects path errors by message heuristic", () => {
      expect(humanizeError("Strategy 'foo.bat' not found")).toContain("не найдены");
    });

    it("passes unknown strings through unchanged", () => {
      expect(humanizeError("Unknown error")).toBe("Unknown error");
    });
  });

  describe("edge cases", () => {
    it("handles null without throwing", () => {
      expect(() => humanizeError(null)).not.toThrow();
    });

    it("handles undefined without throwing", () => {
      expect(() => humanizeError(undefined)).not.toThrow();
    });
  });
});
