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

  const [excludedStrategies, setExcludedStrategies] = useState(() => {
    try {
      const saved = localStorage.getItem("zapret_excluded_strategies");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAutostart, setIsAutostart] = useState(false);
  const [isGameFilter, setIsGameFilter] = useState(() => {
    return localStorage.getItem("zapret_game_filter") === "true";
  });

  // Persistence effects
  useEffect(() => {
    localStorage.setItem("zapret_excluded_strategies", JSON.stringify(excludedStrategies));
  }, [excludedStrategies]);

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

  useEffect(() => {
    localStorage.setItem("zapret_game_filter", isGameFilter.toString());
  }, [isGameFilter]);

  // Initial loads
  useEffect(() => {
    invoke("is_autostart_enabled")
      .then(setIsAutostart)
      .catch(err => console.error("[Settings] Failed to check autostart:", err));
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
  const toggleGameFilter = () => setIsGameFilter(prev => !prev);

  const toggleExcludedStrategy = (value) => {
    setExcludedStrategies(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };

  return {
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
    toggleGameFilter
  };
}
