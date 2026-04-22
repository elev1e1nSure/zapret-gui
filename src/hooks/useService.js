import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STRATEGIES, APP_STATUS } from "../config";

export function useService() {
  // Основные состояния сервиса
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(APP_STATUS.READY);
  const [selectedStrategy, setSelectedStrategy] = useState("auto");
  const [theme, setTheme] = useState("dark");
  
  // Состояния процесса (загрузка, выход, UI)
  const [processState, setProcessState] = useState({
    isLoading: false,
    isExiting: false,
    showLoadingUI: false
  });
  
  const [dots, setDots] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const abortControllerRef = useRef(false);

  const activeStrategyLabel = STRATEGIES.find(s => s.value === selectedStrategy)?.label || "Custom";

  // Синхронизация статуса в трее
  useEffect(() => {
    invoke("update_tray_status", { isActive }).catch(() => {});
  }, [isActive]);

  // Управление отображением загрузки
  useEffect(() => {
    const { isLoading } = processState;
    if (!isLoading) {
      setProcessState(prev => ({ ...prev, showLoadingUI: false }));
      return;
    }

    if (selectedStrategy === "auto") {
      setProcessState(prev => ({ ...prev, showLoadingUI: true }));
      return;
    }

    const timeout = setTimeout(() => {
      setProcessState(prev => ({ ...prev, showLoadingUI: true }));
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [processState.isLoading, selectedStrategy]);

  // Анимация точек при подборе
  useEffect(() => {
    if (processState.showLoadingUI && status.startsWith(APP_STATUS.DISCOVERY)) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "." : prev + "."));
      }, 800);
      return () => clearInterval(interval);
    }
    setDots("");
  }, [processState.showLoadingUI, status]);

  // Завершение любого процесса (запуск/остановка)
  const finalizeProcess = useCallback(() => {
    setTimeout(() => {
      setProcessState({
        isLoading: false,
        isExiting: false,
        showLoadingUI: false
      });
    }, 300);
  }, []);

  const abortDiscovery = async () => {
    abortControllerRef.current = true;
    setProcessState(prev => ({ ...prev, isExiting: true }));
    setStatus(APP_STATUS.READY);

    try {
      await invoke("abort_auto_discovery");
    } catch (error) {
      // Игнорируем ошибки при отмене
    }
    
    finalizeProcess();
  };

  const toggleService = useCallback(async () => {
    if (processState.isLoading) {
      await abortDiscovery();
      return;
    }

    if (isActive) {
      setIsActive(false);
      setProcessState({ isLoading: true, isExiting: true, showLoadingUI: false });
      setStatus(APP_STATUS.READY);

      try {
        await invoke("stop_service");
        finalizeProcess();
      } catch (error) {
        setStatus(APP_STATUS.ERROR(error));
        setProcessState({ isLoading: false, isExiting: false, showLoadingUI: false });
      }
      return;
    }

    setProcessState({ isLoading: true, isExiting: false, showLoadingUI: false });
    abortControllerRef.current = false;
    
    try {
      if (selectedStrategy === "auto") {
        setStatus(APP_STATUS.DISCOVERY);
        const strategyValues = STRATEGIES
          .filter(s => s.value !== "auto")
          .map(s => s.value);
        
        const bestStrategy = await invoke("run_auto_discovery", { strategies: strategyValues });
        
        if (!abortControllerRef.current) {
          setSelectedStrategy(bestStrategy);
          setIsActive(true);
          const label = STRATEGIES.find(s => s.value === bestStrategy)?.label || "Custom";
          setStatus(APP_STATUS.MATCHED(label));
        }
      } else {
        await invoke("run_strategy", { name: selectedStrategy });
        setIsActive(true);
        setStatus(APP_STATUS.RUNNING(activeStrategyLabel));
      }
    } catch (error) {
      if (!abortControllerRef.current && error !== APP_STATUS.DISCOVERY_ABORTED) {
        setIsActive(false);
        setStatus(APP_STATUS.ERROR(error));
      }
    } finally {
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isActive, processState.isLoading, selectedStrategy, activeStrategyLabel, finalizeProcess]);

  useEffect(() => {
    const unlisten = listen("tray-toggle", () => {
      toggleService();
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [toggleService]);

  return {
    isActive,
    status,
    isLoading: processState.isLoading,
    showLoadingUI: processState.showLoadingUI,
    isExiting: processState.isExiting,
    selectedStrategy,
    setSelectedStrategy,
    dots,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleService,
    activeStrategyLabel,
    theme,
    setTheme
  };
}
