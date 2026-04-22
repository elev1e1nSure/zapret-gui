import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STRATEGIES } from "../config";

export function useService() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Zapret готов к запуску");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("auto");
  const [isExiting, setIsExiting] = useState(false);
  const [dots, setDots] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const abortControllerRef = useRef(false);

  const activeStrategyLabel = STRATEGIES.find(s => s.value === selectedStrategy)?.label || "Custom";

  useEffect(() => {
    if (!isLoading) {
      setShowLoadingUI(false);
      return;
    }

    if (selectedStrategy === "auto") {
      setShowLoadingUI(true);
      return;
    }

    const timeout = setTimeout(() => setShowLoadingUI(true), 500);
    return () => clearTimeout(timeout);
  }, [isLoading, selectedStrategy]);

  useEffect(() => {
    if (showLoadingUI && status.startsWith("Подбор стратегии")) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "." : prev + "."));
      }, 800);
      return () => clearInterval(interval);
    }
    setDots("");
  }, [showLoadingUI, status]);

  const abortDiscovery = async () => {
    abortControllerRef.current = true;
    setIsExiting(true);
    setStatus("Zapret готов к запуску");

    try {
      await invoke("abort_auto_discovery");
    } catch (error) {
      // Ignore error during abort
    }
    
    setTimeout(() => {
      setIsLoading(false);
      setShowLoadingUI(false);
      setIsExiting(false);
    }, 300);
  };

  const toggleService = async () => {
    if (isLoading) {
      await abortDiscovery();
      return;
    }

    if (isActive) {
      setIsActive(false);
      setIsLoading(true);
      setIsExiting(true);
      setStatus("Zapret готов к запуску");

      try {
        await invoke("stop_service");
        setTimeout(() => {
          setIsLoading(false);
          setShowLoadingUI(false);
          setIsExiting(false);
        }, 300);
      } catch (error) {
        setStatus(`Ошибка остановки: ${error}`);
        setIsLoading(false);
        setIsExiting(false);
      }
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = false;
    
    try {
      if (selectedStrategy === "auto") {
        setStatus("Подбор стратегии");
        const strategyValues = STRATEGIES
          .filter(s => s.value !== "auto")
          .map(s => s.value);
        
        const bestStrategy = await invoke("run_auto_discovery", { strategies: strategyValues });
        
        if (!abortControllerRef.current) {
          setSelectedStrategy(bestStrategy);
          setIsActive(true);
          const label = STRATEGIES.find(s => s.value === bestStrategy)?.label || "Custom";
          setStatus(`${label} подобран`);
        }
      } else {
        await invoke("run_strategy", { name: selectedStrategy });
        setIsActive(true);
        setStatus(`${activeStrategyLabel} запущен`);
      }
    } catch (error) {
      if (!abortControllerRef.current && error !== "Поиск отменен") {
        setIsActive(false);
        setStatus(`Ошибка: ${error}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isActive,
    status,
    isLoading,
    showLoadingUI,
    selectedStrategy,
    setSelectedStrategy,
    isExiting,
    dots,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleService,
    activeStrategyLabel
  };
}
