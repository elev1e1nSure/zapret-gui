import { useState, useEffect } from "react";
import { TIMEOUTS, APP_STATUS } from "../config";

export function useServiceUI(isLoading, status) {
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const discoveryPrefix = APP_STATUS.DISCOVERY();

  // Spinner logic: only for auto-discovery
  useEffect(() => {
    const isAuto = status.startsWith(discoveryPrefix);
    
    if (isLoading && isAuto) {
      setShowLoadingUI(true);
    } else {
      setShowLoadingUI(false);
    }
  }, [isLoading, status, discoveryPrefix]);

  return {
    showLoadingUI,
    isDiscovery: status.startsWith(discoveryPrefix)
  };
}
