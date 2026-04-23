import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS, STRATEGIES } from "../config";
import { usePersistedState } from "./usePersistedState";

const boolSerialize = (v) => String(Boolean(v));
const boolDeserialize = (raw) => raw === "true";

const jsonSerialize = (v) => JSON.stringify(v);
const jsonDeserialize = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const strategyDeserialize = (raw) =>
  STRATEGIES.some(s => s.value === raw) ? raw : "auto";

export function useSettings() {
  const [selectedStrategy, setSelectedStrategy] = usePersistedState(
    STORAGE_KEYS.STRATEGY,
    "auto",
    { deserialize: strategyDeserialize },
  );
  const [theme, setTheme] = usePersistedState(STORAGE_KEYS.THEME, "dark");
  const [isAutoConnect, setIsAutoConnect] = usePersistedState(
    STORAGE_KEYS.AUTOCONNECT,
    false,
    { serialize: boolSerialize, deserialize: boolDeserialize },
  );
  const [isMinimizeToTray, setIsMinimizeToTray] = usePersistedState(
    STORAGE_KEYS.MINIMIZE_TO_TRAY,
    true,
    { serialize: boolSerialize, deserialize: boolDeserialize },
  );
  const [excludedStrategies, setExcludedStrategies] = usePersistedState(
    STORAGE_KEYS.EXCLUDED,
    [],
    { serialize: jsonSerialize, deserialize: jsonDeserialize },
  );
  const [isGameFilter, setIsGameFilter] = usePersistedState(
    STORAGE_KEYS.GAME_FILTER,
    false,
    { serialize: boolSerialize, deserialize: boolDeserialize },
  );

  const [isAutostart, setIsAutostart] = useState(false);

  // Sync tray visibility on every change
  useEffect(() => {
    invoke("set_tray_visible", { visible: isMinimizeToTray }).catch(err => {
      console.error("[Settings] Failed to sync tray visibility:", err);
    });
  }, [isMinimizeToTray]);

  // Initial autostart probe
  useEffect(() => {
    invoke("is_autostart_enabled")
      .then(setIsAutostart)
      .catch(err => console.error("[Settings] Failed to check autostart:", err));
  }, []);

  const toggleAutostart = useCallback(async () => {
    try {
      const newState = !isAutostart;
      await invoke("set_autostart", { enable: newState });
      setIsAutostart(newState);
    } catch (error) {
      console.error("[Settings] Failed to toggle autostart:", error);
    }
  }, [isAutostart]);

  const toggleAutoConnect = useCallback(
    () => setIsAutoConnect(prev => !prev),
    [setIsAutoConnect],
  );
  const toggleMinimizeToTray = useCallback(
    () => setIsMinimizeToTray(prev => !prev),
    [setIsMinimizeToTray],
  );
  const toggleGameFilter = useCallback(
    () => setIsGameFilter(prev => !prev),
    [setIsGameFilter],
  );

  const toggleExcludedStrategy = useCallback((value) => {
    setExcludedStrategies(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value],
    );
  }, [setExcludedStrategies]);

  // Stable identity — avoids cascading recomputations in consuming hooks.
  return useMemo(() => ({
    selectedStrategy,
    setSelectedStrategy,
    excludedStrategies,
    toggleExcludedStrategy,
    theme,
    setTheme,
    isAutoConnect,
    toggleAutoConnect,
    isMinimizeToTray,
    toggleMinimizeToTray,
    isAutostart,
    toggleAutostart,
    isGameFilter,
    toggleGameFilter,
  }), [
    selectedStrategy, setSelectedStrategy,
    excludedStrategies, toggleExcludedStrategy,
    theme, setTheme,
    isAutoConnect, toggleAutoConnect,
    isMinimizeToTray, toggleMinimizeToTray,
    isAutostart, toggleAutostart,
    isGameFilter, toggleGameFilter,
  ]);
}
