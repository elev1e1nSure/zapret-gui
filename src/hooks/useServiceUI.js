import { useState, useEffect } from "react";
import { TIMEOUTS, APP_STATUS } from "../config";

export function useServiceUI(isLoading, status) {
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const [dots, setDots] = useState("");

  // Spinner delay logic
  useEffect(() => {
    if (!isLoading) {
      setShowLoadingUI(false);
      return;
    }

    // Auto discovery shows immediately, manual strategies have a small delay
    const isAuto = status === APP_STATUS.DISCOVERY();
    if (isAuto) {
      setShowLoadingUI(true);
      return;
    }

    const timeout = setTimeout(() => {
      setShowLoadingUI(true);
    }, TIMEOUTS.UI_SPINNER_DELAY);
    
    return () => clearTimeout(timeout);
  }, [isLoading, status]);

  // Animated dots for discovery
  useEffect(() => {
    if (showLoadingUI && status.startsWith(APP_STATUS.DISCOVERY())) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "." : prev + "."));
      }, TIMEOUTS.DOTS_ANIMATION_INTERVAL);
      return () => clearInterval(interval);
    }
    setDots("");
  }, [showLoadingUI, status]);

  return {
    showLoadingUI,
    dots
  };
}
