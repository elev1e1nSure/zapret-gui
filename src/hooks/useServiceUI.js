import { useState, useEffect } from "react";
import { TIMEOUTS, APP_STATUS } from "../config";

export function useServiceUI(isLoading, status) {
  const [showLoadingUI, setShowLoadingUI] = useState(false);

  // Spinner logic: only for auto-discovery
  useEffect(() => {
    const isAuto = status === APP_STATUS.DISCOVERY();
    
    if (isLoading && isAuto) {
      setShowLoadingUI(true);
    } else {
      setShowLoadingUI(false);
    }
  }, [isLoading, status]);

  return {
    showLoadingUI,
    isDiscovery: status.startsWith(APP_STATUS.DISCOVERY())
  };
}
