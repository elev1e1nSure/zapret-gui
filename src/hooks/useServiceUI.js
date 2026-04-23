import { APP_STATUS } from "../config";

// `showLoadingUI` is purely derived from props — no useState/useEffect needed.
export function useServiceUI(isLoading, status, forceDiscoveryUI = false) {
  const discoveryPrefix = APP_STATUS.DISCOVERY();
  const isAuto = status.startsWith(discoveryPrefix);

  return {
    showLoadingUI: isLoading && (isAuto || forceDiscoveryUI),
    isDiscovery: isAuto,
  };
}
