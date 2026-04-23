// @vitest-environment jsdom
/**
 * Smoke integration tests for useService.
 *
 * These tests mock the Tauri IPC boundary (invoke / listen) so the entire
 * React hook state-machine can be exercised without a running Tauri runtime.
 * They cover the three most critical user flows:
 *   1. Start with a specific strategy
 *   2. Stop the running service
 *   3. Strategy failure → error state
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Tauri API mocks (hoisted by Vitest before any imports) ────────────────
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  // listen() returns Promise<UnlistenFn>
  listen: vi.fn().mockResolvedValue(() => {}),
}));

import { invoke } from "@tauri-apps/api/core";
import { APP_STATUS, STORAGE_KEYS } from "../../config";
import { useService } from "../useService";

// ── Helpers ───────────────────────────────────────────────────────────────
function setupInvoke({ runStrategyResult = undefined, stopServiceResult = undefined } = {}) {
  invoke.mockImplementation((cmd) => {
    switch (cmd) {
      case "run_strategy":   return runStrategyResult ?? Promise.resolve();
      case "stop_service":   return stopServiceResult ?? Promise.resolve();
      case "run_auto_discovery": return Promise.resolve("general_silent.bat");
      default:               return Promise.resolve();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Use a concrete strategy (not "auto") so tests don't trigger discovery
  localStorage.setItem(STORAGE_KEYS.STRATEGY, "general_silent.bat");
  // autoconnect off so mount doesn't trigger toggleService automatically
  localStorage.removeItem(STORAGE_KEYS.AUTOCONNECT);
  setupInvoke();
});

afterEach(() => vi.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────
describe("smoke: initial state", () => {
  it("starts inactive with READY status", () => {
    const { result } = renderHook(() => useService());
    expect(result.current.isActive).toBe(false);
    expect(result.current.status).toBe(APP_STATUS.READY());
    expect(result.current.isLoading).toBe(false);
  });
});

describe("smoke: toggle ON — specific strategy", () => {
  it("becomes active after successful run_strategy", async () => {
    const { result } = renderHook(() => useService());

    await act(async () => {
      await result.current.toggleService();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(invoke).toHaveBeenCalledWith(
      "run_strategy",
      expect.objectContaining({ name: "general_silent.bat" })
    );
  });
});

describe("smoke: toggle OFF — stop service", () => {
  it("becomes inactive after stop_service", async () => {
    const { result } = renderHook(() => useService());

    // Turn ON
    await act(async () => { await result.current.toggleService(); });
    expect(result.current.isActive).toBe(true);

    // Turn OFF
    await act(async () => { await result.current.toggleService(); });

    await waitFor(() => expect(result.current.isActive).toBe(false));
    expect(invoke).toHaveBeenCalledWith("stop_service");
  });
});

describe("smoke: strategy failure → error state", () => {
  it("shows error status when run_strategy rejects", async () => {
    setupInvoke({
      runStrategyResult: Promise.reject({
        type: "Process",
        message: "Process error: winws.exe failed with code 5",
      }),
    });

    const { result } = renderHook(() => useService());

    await act(async () => {
      await result.current.toggleService();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.status).toMatch(/Ошибка/);
  });

  it("DiscoveryAborted error does NOT change status to error", async () => {
    setupInvoke({
      runStrategyResult: Promise.reject({ type: "DiscoveryAborted", message: "Search aborted" }),
    });

    const { result } = renderHook(() => useService());

    await act(async () => {
      await result.current.toggleService();
    });

    // Status should NOT contain "Ошибка" — aborted discovery is a silent cancel
    expect(result.current.status).not.toMatch(/Ошибка/);
  });
});

describe("smoke: auto-discovery flow", () => {
  it("resolves to active when discovery returns a strategy", async () => {
    // Switch to auto mode
    localStorage.setItem(STORAGE_KEYS.STRATEGY, "auto");

    const { result } = renderHook(() => useService());

    await act(async () => {
      await result.current.toggleService();
    });

    expect(result.current.isActive).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      "run_auto_discovery",
      expect.objectContaining({ strategies: expect.any(Array) })
    );
  });
});
