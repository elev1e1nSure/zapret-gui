import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS } from "../config";

const CACHE_KEY = "zapret_last_working_strategy";

function getLastWorkingStrategy() {
  return localStorage.getItem(CACHE_KEY);
}

function setLastWorkingStrategy(strategy) {
  if (strategy) localStorage.setItem(CACHE_KEY, strategy);
}

export function clearStrategyCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch {
    return false;
  }
}

function prioritizeCached(strategies) {
  const cached = getLastWorkingStrategy();
  if (!cached || !strategies.includes(cached)) return strategies;
  return [cached, ...strategies.filter(s => s !== cached)];
}

function humanizeError(error) {
  const str = String(error);
  if (str.includes("Process error") || str.includes("Failed to start")) {
    return "Не удалось запустить стратегию. Попробуйте другую или перезапустите приложение.";
  }
  if (str.includes("Path error") || str.includes("not found")) {
    return "Файлы стратегии не найдены. Попробуйте перезапустить приложение.";
  }
  return str;
}

export { humanizeError };

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
      const label = STRATEGIES.find(s => s.value === strategy)?.label || strategy;
      setStatus(APP_STATUS.DISCOVERY(label, index, total));
    });
    return () => { unlisten.then(f => f()); };
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
  }, [setStatus, setProcessState, abortControllerRef]);

  const startDiscovery = useCallback(async () => {
    const available = STRATEGIES
      .filter(s => s.value !== "auto" && !settings.excludedStrategies.includes(s.value))
      .map(s => s.value);
    const strategyValues = prioritizeCached(available);

    if (strategyValues.length === 0) {
      throw "Все стратегии исключены. Включите хотя бы одну в настройках.";
    }

    const first = strategyValues[0];
    const firstLabel = STRATEGIES.find(s => s.value === first)?.label || first;
    setStatus(APP_STATUS.DISCOVERY(firstLabel, 1, strategyValues.length));

    const bestStrategy = await invoke("run_auto_discovery", {
      strategies: strategyValues,
      isGameFilter: settings.isGameFilter
    });

    if (!abortControllerRef.current) {
      settings.setSelectedStrategy(bestStrategy);
      setLastWorkingStrategy(bestStrategy);
      setIsActive(true);
      const label = STRATEGIES.find(s => s.value === bestStrategy)?.label || "Custom";
      setStatus(APP_STATUS.MATCHED(label));
    }
  }, [settings, setStatus, setIsActive, abortControllerRef]);

  return { startDiscovery, abortDiscovery };
}
