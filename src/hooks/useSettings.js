import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TIMEOUTS } from "../config";

export function useSettings() {
  const [selectedStrategy, setSelectedStrategy] = useState(() => {
    return localStorage.getItem("zapret_strategy") || "auto";
  });
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("zapret_theme") || "dark";
  });
  
  const [isAutoConnect, setIsAutoConnect] = useState(() => {
    return localStorage.getItem("zapret_autoconnect") === "true";
  });
  
  const [isMinimizeToTray, setIsMinimizeToTray] = useState(() => {
    const saved = localStorage.getItem("zapret_minimize_to_tray");
    return saved === null ? true : saved === "true";
  });

  const [isAutostart, setIsAutostart] = useState(false);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem("zapret_strategy", selectedStrategy);
  }, [selectedStrategy]);

  useEffect(() => {
    localStorage.setItem("zapret_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("zapret_autoconnect", isAutoConnect.toString());
  }, [isAutoConnect]);

  useEffect(() => {
    localStorage.setItem("zapret_minimize_to_tray", isMinimizeToTray.toString());
    invoke("set_tray_visible", { visible: isMinimizeToTray }).catch(err => {
      console.error("[Settings] Failed to sync tray visibility:", err);
    });
  }, [isMinimizeToTray]);

  // Initial loads
  useEffect(() => {
    invoke("is_autostart_enabled")
      .then(setIsAutostart)
      .catch(err => console.error("[Settings] Failed to check autostart:", err));
    
    const timer = setTimeout(() => {
      invoke("set_tray_visible", { visible: isMinimizeToTray }).catch(() => {});
    }, TIMEOUTS.TRAY_SYNC_DELAY);

    return () => clearTimeout(timer);
  }, []);

  const toggleAutostart = async () => {
    try {
      const newState = !isAutostart;
      await invoke("set_autostart", { enable: newState });
      setIsAutostart(newState);
    } catch (error) {
      console.error("[Settings] Failed to toggle autostart:", error);
    }
  };

  const toggleAutoConnect = () => setIsAutoConnect(prev => !prev);
  const toggleMinimizeToTray = () => setIsMinimizeToTray(prev => !prev);

  return {
    selectedStrategy,
    setSelectedStrategy,
    theme,
    setTheme,
    isAutoConnect,
    toggleAutoConnect,
    isMinimizeToTray,
    toggleMinimizeToTray,
    isAutostart,
    toggleAutostart
  };
}
