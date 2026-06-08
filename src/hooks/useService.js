import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { APP_STATUS, TIMEOUTS, DISCOVERY_ABORTED_TYPE } from "../config";
import { useSettings } from "./useSettings";
import { useServiceUI } from "./useServiceUI";
import { useDiscovery, humanizeError } from "./useDiscovery";

const CONNECTING_MESSAGES = [
  "Запускаем защиту...",
  "Проверяем соединение...",
  "Настраиваем параметры...",
  "Ищем лучшие настройки...",
];

export function useService() {
  const settings = useSettings();

  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(APP_STATUS.READY());
  const [currentScreen, setCurrentScreen] = useState("main");
  const [processState, setProcessState] = useState({ isLoading: false, isExiting: false });

  const { showLoadingUI } = useServiceUI(processState.isLoading, status);
  const abortControllerRef = useRef(false);
  const finalizeTimerRef = useRef(null);

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

  // Cycle through friendly status messages while loading but not yet in discovery
  useEffect(() => {
    if (!processState.isLoading) return;

    const discoveryPrefix = APP_STATUS.DISCOVERY();
    let i = 0;
    setStatus(CONNECTING_MESSAGES[0]);

    const interval = setInterval(() => {
      i = (i + 1) % CONNECTING_MESSAGES.length;
      setStatus(prev => prev.startsWith(discoveryPrefix) ? prev : CONNECTING_MESSAGES[i]);
    }, 4500);

    return () => clearInterval(interval);
  }, [processState.isLoading]);

  const { startDiscovery, abortDiscovery } = useDiscovery({
    setStatus,
    setIsActive,
    setProcessState,
    abortControllerRef,
  });

  useEffect(() => {
    invoke("update_tray_status", { isActive }).catch(err => {
      console.error("[Service] Failed to update tray status:", err);
    });
  }, [isActive]);

  // SSE listener for real-time core status
  useEffect(() => {
    let es = null;
    let reconnectTimer = null;

    const connect = () => {
      try {
        es = new EventSource("http://127.0.0.1:7432/api/events");

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "status") {
              if (data.status === "running" && data.strategy) {
                setIsActive(true);
                setStatus(APP_STATUS.RUNNING(data.strategy));
              } else if (data.status === "stopped") {
                setIsActive(false);
                setStatus(APP_STATUS.READY());
              }
            }
          } catch {
            // ignore malformed events
          }
        };

        es.onerror = () => {
          if (es) es.close();
        };
      } catch {
        // EventSource not available
      }
    };

    if (isActive) {
      connect();
    }

    return () => {
      if (es) es.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isActive]);

  const toggleService = useCallback(async () => {
    if (processState.isExiting) return;

    if (isActive) {
      setIsActive(false);
      setProcessState({ isLoading: false, isExiting: true });
      setStatus(APP_STATUS.READY());
      // Fire and forget — don't block the button while winws terminates
      invoke("stop_service").catch(err => {
        console.warn("[Service] stop_service failed:", err);
      });
      finalizeProcess(); // 300ms animation, then isExiting: false
      return;
    }

    if (processState.isLoading) {
      await abortDiscovery();
      finalizeProcess();
      return;
    }

    setProcessState({ isLoading: true, isExiting: false });
    abortControllerRef.current = false;

    try {
      console.log("[Service] starting discovery");
      await startDiscovery();
    } catch (discError) {
      if (!abortControllerRef.current && discError?.type !== DISCOVERY_ABORTED_TYPE) {
        console.warn("[Service] discovery failed:", discError);
        setIsActive(false);
        setStatus(APP_STATUS.ERROR(humanizeError(discError)));
      }
    } finally {
      setProcessState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isActive, processState.isLoading, processState.isExiting, finalizeProcess, startDiscovery, abortDiscovery]);

  const toggleServiceRef = useRef(toggleService);
  useEffect(() => { toggleServiceRef.current = toggleService; }, [toggleService]);

  useEffect(() => {
    const unlisten = listen("tray-toggle", () => toggleServiceRef.current());
    return () => { unlisten.then(f => f()).catch(console.warn); };
  }, []);

  useEffect(() => {
    let timer = null;

    const init = async () => {
      // Sync with actual core state on startup
      let alreadyRunning = false;
      try {
        const statusJson = await invoke("get_status");
        const coreStatus = JSON.parse(statusJson);
        if (coreStatus.winws_running) {
          alreadyRunning = true;
          setIsActive(true);
          setStatus(APP_STATUS.RUNNING(coreStatus.current_strategy ?? "Best"));
        }
      } catch {
        // Core not running yet — proceed normally
      }

      // AutoConnect only if core isn't already running
      if (settings.isAutoConnect && !alreadyRunning) {
        timer = setTimeout(() => toggleServiceRef.current(), TIMEOUTS.AUTO_CONNECT_DELAY);
      }
    };

    init();
    return () => { if (timer) clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetKnowledge = useCallback(async () => {
    try {
      await invoke("reset_knowledge");
      // After reset winws was stopped — sync GUI state
      setIsActive(false);
      setStatus(APP_STATUS.READY());
      return true;
    } catch (error) {
      console.error("[Service] Failed to reset knowledge:", error);
      return false;
    }
  }, [setIsActive, setStatus]);

  return {
    isActive,
    status,
    isLoading: processState.isLoading,
    showLoadingUI,
    isExiting: processState.isExiting,
    toggleService,
    theme: settings.theme,
    setTheme: settings.setTheme,
    isAutostart: settings.isAutostart,
    toggleAutostart: settings.toggleAutostart,
    isAutoConnect: settings.isAutoConnect,
    toggleAutoConnect: settings.toggleAutoConnect,
    isMinimizeToTray: settings.isMinimizeToTray,
    toggleMinimizeToTray: settings.toggleMinimizeToTray,
    resetAppData: settings.resetAppData,
    resetKnowledge,
    currentScreen,
    setCurrentScreen,
  };
}
