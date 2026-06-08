import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS } from "../config";
import { usePersistedState } from "./usePersistedState";

const boolSerialize = (v) => String(Boolean(v));
const boolDeserialize = (raw) => raw === "true";

export function useSettings() {
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

  const resetAppData = useCallback(async () => {
    try {
      await invoke("set_autostart", { enable: false });
      setIsAutostart(false);
    } catch (error) {
      console.error("[Settings] Failed to disable autostart during reset:", error);
    }

    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("[Settings] Failed to clear local storage during reset:", error);
      return false;
    }

    setTheme("dark");
    setIsAutoConnect(false);
    setIsMinimizeToTray(true);

    return true;
  }, [
    setIsAutoConnect,
    setIsMinimizeToTray,
    setTheme,
  ]);

  return useMemo(() => ({
    theme,
    setTheme,
    isAutoConnect,
    toggleAutoConnect,
    isMinimizeToTray,
    toggleMinimizeToTray,
    isAutostart,
    toggleAutostart,
    resetAppData,
  }), [
    theme, setTheme,
    isAutoConnect, toggleAutoConnect,
    isMinimizeToTray, toggleMinimizeToTray,
    isAutostart, toggleAutostart,
    resetAppData,
  ]);
}
