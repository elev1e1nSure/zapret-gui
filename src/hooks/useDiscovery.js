import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS } from "../config";
import {
  clearStrategyCache,
  prioritizeCached,
  setLastWorkingStrategy,
} from "../utils/strategyCache";
import { humanizeError } from "../utils/errors";

export { clearStrategyCache, humanizeError };

function labelOf(value, fallback = "Custom") {
  return STRATEGIES.find(s => s.value === value)?.label || fallback;
}

function availableValues(excluded, extraSkip = null) {
  return STRATEGIES
    .filter(s => s.value !== "auto" && !excluded.includes(s.value) && s.value !== extraSkip)
    .map(s => s.value);
}

/**
 * Handles auto-discovery lifecycle: start, abort, event listener, cache.
 *
 * @param {object} deps
 * @param {object} deps.settings        - from useSettings
 * @param {Function} deps.setStatus     - setState setter for status string
 * @param {Function} deps.setIsActive   - setState setter for isActive
 * @param {Function} deps.setProcessState
 * @param {object} deps.abortControllerRef - ref<boolean>
 */
export function useDiscovery({ settings, setStatus, setIsActive, setProcessState, abortControllerRef }) {
  // Listen to per-strategy progress events from Rust
  useEffect(() => {
    const unlisten = listen("discovery-strategy", (event) => {
      const { strategy, index, total } = event.payload;
      setStatus(APP_STATUS.DISCOVERY(labelOf(strategy, strategy), index, total));
    });
    return () => { unlisten.then(f => f()).catch(console.warn); };
  }, [setStatus]);

  const abortDiscovery = useCallback(async () => {
    abortControllerRef.current = true;
    setProcessState(prev => ({ ...prev, isExiting: true }));
    setStatus(APP_STATUS.READY());
    try {
      await invoke("abort_auto_discovery");
    } catch (err) {
      console.warn("[Discovery] Abort failed:", err);
    }
  }, [setStatus, setProcessState]); // eslint-disable-line react-hooks/exhaustive-deps -- abortControllerRef is a ref (stable); adding it is incorrect

  // Given a pre-ordered list of strategy values, drives the discovery RPC and
  // commits the result on success. Shared body for both discovery flavors.
  const runOrderedDiscovery = useCallback(async (strategyValues) => {
    if (strategyValues.length === 0) {
      throw new Error("Все стратегии исключены. Включите хотя бы одну в настройках.");
    }

    setStatus(APP_STATUS.DISCOVERY(labelOf(strategyValues[0], strategyValues[0]), 1, strategyValues.length));

    const bestStrategy = await invoke("run_auto_discovery", {
      strategies: strategyValues,
      isGameFilter: settings.isGameFilter,
    });

    if (!abortControllerRef.current) {
      settings.setSelectedStrategy(bestStrategy);
      setLastWorkingStrategy(bestStrategy);
      setIsActive(true);
      setStatus(APP_STATUS.MATCHED(labelOf(bestStrategy)));
    }
  }, [settings, setStatus, setIsActive]); // eslint-disable-line react-hooks/exhaustive-deps -- abortControllerRef is a ref (stable); adding it is incorrect

  const startDiscovery = useCallback(async () => {
    const ordered = prioritizeCached(availableValues(settings.excludedStrategies));
    await runOrderedDiscovery(ordered);
  }, [settings.excludedStrategies, runOrderedDiscovery]);

  // Like startDiscovery but skips a specific strategy and begins from the one
  // after it. Does not use the cache (the skipped strategy was the cached "best").
  const startDiscoverySkipping = useCallback(async (strategyToSkip) => {
    const available = availableValues(settings.excludedStrategies, strategyToSkip);
    const skipIdx = STRATEGIES.findIndex(s => s.value === strategyToSkip);

    const afterSkip = [];
    const beforeSkip = [];
    for (const s of STRATEGIES) {
      if (!available.includes(s.value)) continue;
      const idx = STRATEGIES.findIndex(st => st.value === s.value);
      if (idx > skipIdx) afterSkip.push(s.value);
      else beforeSkip.push(s.value);
    }

    await runOrderedDiscovery([...afterSkip, ...beforeSkip]);
  }, [settings.excludedStrategies, runOrderedDiscovery]);

  return { startDiscovery, startDiscoverySkipping, abortDiscovery };
}
