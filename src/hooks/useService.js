import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS, TIMEOUTS } from "../config";
import { useSettings } from "./useSettings";
import { useServiceUI } from "./useServiceUI";

export function useService() {
  const settings = useSettings();
  
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(APP_STATUS.READY());
  const [currentScreen, setCurrentScreen] = useState("main");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [processState, setProcessState] = useState({
    isLoading: false,
    isExiting: false
  });

  const { showLoadingUI, isDiscovery } = useServiceUI(processState.isLoading, status);
  const abortControllerRef = useRef(false);
  const activeStrategyLabel = STRATEGIES.find(s => s.value === settings.selectedStrategy)?.label || "Custom";

  // Tray Sync
  useEffect(() => {
    invoke("update_tray_status", { isActive }).catch(err => {
      console.error("[Service] Failed to update tray status:", err);
    });
  }, [isActive]);

  const finalizeProcess = useCallback(() => {
    setTimeout(() => {
      setProcessState({
        isLoading: false,
        isExiting: false
      });
    }, TIMEOUTS.PROCESS_FINALIZE_DELAY);
  }, []);

  const abortDiscovery = async () => {
    abortControllerRef.current = true;
    setProcessState(prev => ({ ...prev, isExiting: true }));
    setStatus(APP_STATUS.READY());

    try {
      await invoke("abort_auto_discovery");
    } catch (error) {
      console.warn("[Service] Abort discovery failed:", error);
    }
    
    finalizeProcess();
  };

  const startDiscovery = useCallback(async () => {
    // Устанавливаем статус немедленно
    setStatus(APP_STATUS.DISCOVERY());
    
    const strategyValues = STRATEGIES
      .filter(s => s.value !== "auto" && !settings.excludedStrategies.includes(s.value))
      .map(s => s.value);
    
    if (strategyValues.length === 0) {
      throw "Нет доступных стратегий для подбора (все в исключениях)";
    }

    const bestStrategy = await invoke("run_auto_discovery", {
      strategies: strategyValues,
      isGameFilter: settings.isGameFilter
    });
    
    if (!abortControllerRef.current) {
      settings.setSelectedStrategy(bestStrategy);
      setIsActive(true);
      const label = STRATEGIES.find(s => s.value === bestStrategy)?.label || "Custom";
      setStatus(APP_STATUS.MATCHED(label));
    }
  }, [settings]);

  const toggleService = useCallback(async () => {
    if (processState.isLoading) {
      await abortDiscovery();
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
        setStatus(APP_STATUS.ERROR(error));
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
        // Оптимистичное обновление UI для мгновенного отклика
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
        setStatus(APP_STATUS.ERROR(error));
      }
    } finally {
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isActive, processState.isLoading, settings, activeStrategyLabel, finalizeProcess, startDiscovery]);

  const toggleServiceRef = useRef(toggleService);
  useEffect(() => {
    toggleServiceRef.current = toggleService;
  }, [toggleService]);

  useEffect(() => {
    const unlisten = listen("tray-toggle", () => {
      toggleService();
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [toggleService]);

  // Initial Autoconnect
  useEffect(() => {
    if (settings.isAutoConnect) {
      const timer = setTimeout(() => {
        settings.setSelectedStrategy("auto");
        toggleServiceRef.current();
      }, TIMEOUTS.AUTO_CONNECT_DELAY);
      return () => clearTimeout(timer);
    }
  }, []); 

  return {
    isActive,
    status,
    isLoading: processState.isLoading,
    showLoadingUI,
    isExiting: processState.isExiting,
    selectedStrategy: settings.selectedStrategy,
    setSelectedStrategy: settings.setSelectedStrategy,
    isDiscovery,
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
    currentScreen,
    setCurrentScreen
  };
}
