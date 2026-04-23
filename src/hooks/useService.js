import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS, TIMEOUTS } from "../config";
import { useSettings } from "./useSettings";
import { useServiceUI } from "./useServiceUI";
import { useDiscovery, clearStrategyCache, humanizeError } from "./useDiscovery";

export function useService() {
  const settings = useSettings();

  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(APP_STATUS.READY());
  const [currentScreen, setCurrentScreen] = useState("main");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [processState, setProcessState] = useState({ isLoading: false, isExiting: false });

  const { showLoadingUI, isDiscovery } = useServiceUI(processState.isLoading, status);
  const abortControllerRef = useRef(false);
  const activeStrategyLabel = STRATEGIES.find(s => s.value === settings.selectedStrategy)?.label || "Custom";

  const finalizeProcess = useCallback(() => {
    setTimeout(() => {
      setProcessState({ isLoading: false, isExiting: false });
    }, TIMEOUTS.PROCESS_FINALIZE_DELAY);
  }, []);

  const { startDiscovery, abortDiscovery } = useDiscovery({
    settings,
    setStatus,
    setIsActive,
    setProcessState,
    abortControllerRef,
  });

  // Sync active state with tray icon
  useEffect(() => {
    invoke("update_tray_status", { isActive }).catch(err => {
      console.error("[Service] Failed to update tray status:", err);
    });
  }, [isActive]);

  const toggleService = useCallback(async () => {
    if (processState.isLoading) {
      await abortDiscovery();
      finalizeProcess();
      return;
    }

    if (isActive) {
      setIsActive(false);
      setProcessState({ isLoading: true, isExiting: true });
      setStatus(APP_STATUS.READY());
      try {
        await invoke("stop_service");
        finalizeProcess();
      } catch (error) {
        setStatus(APP_STATUS.ERROR(humanizeError(error)));
        setProcessState({ isLoading: false, isExiting: false });
      }
      return;
    }

    setProcessState({ isLoading: true, isExiting: false });
    abortControllerRef.current = false;

    try {
      if (settings.selectedStrategy === "auto") {
        await startDiscovery();
      } else {
        setIsActive(true);
        setStatus(APP_STATUS.RUNNING(activeStrategyLabel));
        await invoke("run_strategy", {
          name: settings.selectedStrategy,
          isGameFilter: settings.isGameFilter
        });
      }
    } catch (error) {
      if (!abortControllerRef.current && error !== APP_STATUS.DISCOVERY_ABORTED()) {
        setIsActive(false);
        setStatus(APP_STATUS.ERROR(humanizeError(error)));
      }
    } finally {
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isActive, processState.isLoading, settings, activeStrategyLabel, finalizeProcess, startDiscovery, abortDiscovery]);

  // Keep a stable ref so tray listener always calls the latest version
  const toggleServiceRef = useRef(toggleService);
  useEffect(() => { toggleServiceRef.current = toggleService; }, [toggleService]);

  // Tray toggle event
  useEffect(() => {
    const unlisten = listen("tray-toggle", () => toggleServiceRef.current());
    return () => { unlisten.then(f => f()); };
  }, []);

  // Autoconnect on startup
  useEffect(() => {
    if (settings.isAutoConnect) {
      const timer = setTimeout(() => {
        settings.setSelectedStrategy("auto");
        toggleServiceRef.current();
      }, TIMEOUTS.AUTO_CONNECT_DELAY);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isActive,
    status,
    isLoading: processState.isLoading,
    showLoadingUI,
    isExiting: processState.isExiting,
    isDiscovery,
    selectedStrategy: settings.selectedStrategy,
    setSelectedStrategy: settings.setSelectedStrategy,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleService,
    activeStrategyLabel,
    theme: settings.theme,
    setTheme: settings.setTheme,
    isAutostart: settings.isAutostart,
    toggleAutostart: settings.toggleAutostart,
    isAutoConnect: settings.isAutoConnect,
    toggleAutoConnect: settings.toggleAutoConnect,
    isMinimizeToTray: settings.isMinimizeToTray,
    toggleMinimizeToTray: settings.toggleMinimizeToTray,
    isGameFilter: settings.isGameFilter,
    toggleGameFilter: settings.toggleGameFilter,
    excludedStrategies: settings.excludedStrategies,
    toggleExcludedStrategy: settings.toggleExcludedStrategy,
    clearStrategyCache,
    currentScreen,
    setCurrentScreen,
  };
}
