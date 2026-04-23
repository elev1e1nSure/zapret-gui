import { describe, expect, it } from "vitest";
import { APP_STATUS } from "../../config";
import { useServiceUI } from "../useServiceUI";

// useServiceUI is a pure computation — no hooks inside, so no renderHook needed.

const DISCOVERY_STATUS = APP_STATUS.DISCOVERY("general_silent.bat", 1, 5);
const READY_STATUS = APP_STATUS.READY();
const RUNNING_STATUS = APP_STATUS.RUNNING("General");

describe("useServiceUI — showLoadingUI", () => {
  it("is true when loading during auto-discovery", () => {
    const { showLoadingUI } = useServiceUI(true, DISCOVERY_STATUS, false);
    expect(showLoadingUI).toBe(true);
  });

  it("is true when loading + forceDiscoveryUI regardless of status", () => {
    const { showLoadingUI } = useServiceUI(true, RUNNING_STATUS, true);
    expect(showLoadingUI).toBe(true);
  });

  it("is false when not loading even during discovery", () => {
    const { showLoadingUI } = useServiceUI(false, DISCOVERY_STATUS, false);
    expect(showLoadingUI).toBe(false);
  });

  it("is false when loading but status is not discovery and forceDiscoveryUI is off", () => {
    const { showLoadingUI } = useServiceUI(true, RUNNING_STATUS, false);
    expect(showLoadingUI).toBe(false);
  });

  it("is false when loading + status is READY", () => {
    const { showLoadingUI } = useServiceUI(true, READY_STATUS, false);
    expect(showLoadingUI).toBe(false);
  });
});

describe("useServiceUI — isDiscovery", () => {
  it("is true for discovery statuses (with label)", () => {
    const { isDiscovery } = useServiceUI(false, DISCOVERY_STATUS, false);
    expect(isDiscovery).toBe(true);
  });

  it("is true for bare DISCOVERY prefix", () => {
    const { isDiscovery } = useServiceUI(false, APP_STATUS.DISCOVERY(), false);
    expect(isDiscovery).toBe(true);
  });

  it("is false for READY status", () => {
    const { isDiscovery } = useServiceUI(false, READY_STATUS, false);
    expect(isDiscovery).toBe(false);
  });

  it("is false for RUNNING status", () => {
    const { isDiscovery } = useServiceUI(false, RUNNING_STATUS, false);
    expect(isDiscovery).toBe(false);
  });
});
