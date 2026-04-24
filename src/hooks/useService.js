import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS, TIMEOUTS, DISCOVERY_ABORTED_TYPE } from "../config";
import { useSettings } from "./useSettings";
import { useServiceUI } from "./useServiceUI";
import { useDiscovery, clearStrategyCache, humanizeError } from "./useDiscovery";

export function useService() {
  const settings = useSettings();

  const [isActive, setIsActive] = useState(false);
  const [isAutoConnected, setIsAutoConnected] = useState(false);
  const [forceDiscoveryUI, setForceDiscoveryUI] = useState(false);
  const [status, setStatus] = useState(APP_STATUS.READY());
  const [currentScreen, setCurrentScreen] = useState("main");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [processState, setProcessState] = useState({ isLoading: false, isExiting: false });

  const { showLoadingUI } = useServiceUI(processState.isLoading, status, forceDiscoveryUI);
  const abortControllerRef = useRef(false);
  const finalizeTimerRef = useRef(null);

  // Computed only for internal use inside toggleService
  const activeStrategyLabel = STRATEGIES.find(s => s.value === settings.selectedStrategy)?.label || "Custom";

  const finalizeProcess = useCallback((immediate = false) => {
    if (immediate) {
      setProcessState({ isLoading: false, isExiting: false });
      return;
    }
    finalizeTimerRef.current = setTimeout(() => {
      setProcessState({ isLoading: false, isExiting: false });
      finalizeTimerRef.current = null;
    }, TIMEOUTS.PROCESS_FINALIZE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (finalizeTimerRef.current) clearTimeout(finalizeTimerRef.current);
    };
  }, []);

  const { startDiscovery, startDiscoverySkipping, abortDiscovery } = useDiscovery({
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
      setIsAutoConnected(false);
      setForceDiscoveryUI(false);
      setProcessState({ isLoading: true, isExiting: true });
      setStatus(APP_STATUS.READY());
      try {
        await invoke("stop_service");
        finalizeProcess(true);
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
        setIsAutoConnected(true);
        setForceDiscoveryUI(false);
      } else {
        setForceDiscoveryUI(false);
        setIsAutoConnected(false);
        setIsActive(true);
        setStatus(APP_STATUS.RUNNING(activeStrategyLabel));
        await invoke("run_strategy", {
          name: settings.selectedStrategy,
          isGameFilter: settings.isGameFilter,
        });
      }
    } catch (error) {
      if (!abortControllerRef.current && error?.type !== DISCOVERY_ABORTED_TYPE) {
        setIsActive(false);
        setIsAutoConnected(false);
        setForceDiscoveryUI(false);
        setStatus(APP_STATUS.ERROR(humanizeError(error)));
      }
    } finally {
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isActive, processState.isLoading, settings, activeStrategyLabel, finalizeProcess, startDiscovery, abortDiscovery]);

  // Called from the "Плохо работает?" button — excludes the current strategy and restarts discovery.
  const reportBadStrategy = useCallback(async (strategyValue) => {
    setIsAutoConnected(false);
    setForceDiscoveryUI(true);
    settings.toggleExcludedStrategy(strategyValue);
    clearStrategyCache();

    setIsActive(false);
    setProcessState({ isLoading: true, isExiting: true });
    setStatus(APP_STATUS.STOPPING());
    try {
      await invoke("stop_service");
    } catch (e) {
      console.warn("[Service] Stop failed during reportBadStrategy:", e);
    }

    // Keep the same stop → start rhythm as normal toggle for a smoother visual transition.
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.PROCESS_FINALIZE_DELAY));

    abortControllerRef.current = false;
    setProcessState({ isLoading: true, isExiting: false });

    try {
      await startDiscoverySkipping(strategyValue);
      setIsAutoConnected(true);
      setForceDiscoveryUI(false);
    } catch (error) {
      if (!abortControllerRef.current && error?.type !== DISCOVERY_ABORTED_TYPE) {
        setIsActive(false);
        setIsAutoConnected(false);
        setForceDiscoveryUI(false);
        setStatus(APP_STATUS.ERROR(humanizeError(error)));
      }
    } finally {
      setForceDiscoveryUI(false);
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [settings, startDiscoverySkipping]);

  // Keep a stable ref so the tray listener always calls the latest version
  const toggleServiceRef = useRef(toggleService);
  useEffect(() => { toggleServiceRef.current = toggleService; }, [toggleService]);

  // Tray toggle event
  useEffect(() => {
    const unlisten = listen("tray-toggle", () => toggleServiceRef.current());
    return () => { unlisten.then(f => f()).catch(console.warn); };
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
    isAutoConnected,
    reportBadStrategy,
    status,
    isLoading: processState.isLoading,
    showLoadingUI,
    isExiting: processState.isExiting,
    selectedStrategy: settings.selectedStrategy,
    setSelectedStrategy: settings.setSelectedStrategy,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleService,
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
    resetAppData: settings.resetAppData,
    currentScreen,
    setCurrentScreen,
  };
}
