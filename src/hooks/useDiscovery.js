import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { APP_STATUS } from "../config";
import { humanizeError } from "../utils/errors";

export { humanizeError };

export function useDiscovery({ setStatus, setIsActive, setProcessState, abortControllerRef }) {
  useEffect(() => {
    const unlisten = listen("discovery-strategy", (event) => {
      const { strategy, index, total } = event.payload;
      console.log(`[Discovery] strategy ${index}/${total}: ${strategy}`);
      setStatus(APP_STATUS.DISCOVERY(strategy, index, total));
    });
    return () => { unlisten.then(f => f()).catch(console.warn); };
  }, [setStatus]);

  const abortDiscovery = useCallback(async () => {
    abortControllerRef.current = true;
    setProcessState({ isLoading: false, isExiting: false });
    setStatus(APP_STATUS.READY());
    try {
      await invoke("abort_auto_discovery");
    } catch (err) {
      console.warn("[Discovery] Abort failed:", err);
    }
  }, [setStatus, setProcessState]);

  const startDiscovery = useCallback(async () => {
    setStatus(APP_STATUS.DISCOVERY("Подбор", 1, 1));

    console.log("[Discovery] run_auto_discovery start");
    const t0 = performance.now();
    const bestStrategy = await invoke("run_auto_discovery", {
      strategies: [],
      isGameFilter: false,
    });
    console.log(`[Discovery] completed in ${((performance.now() - t0) / 1000).toFixed(1)}s, best: ${bestStrategy}`);

    if (!abortControllerRef.current) {
      setIsActive(true);
      setStatus(APP_STATUS.MATCHED(bestStrategy));
    }
  }, [setStatus, setIsActive]);

  return { startDiscovery, abortDiscovery };
}
