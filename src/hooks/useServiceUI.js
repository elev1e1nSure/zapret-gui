import { APP_STATUS } from "../config";

export function useServiceUI(isLoading, status) {
  const discoveryPrefix = APP_STATUS.DISCOVERY();
  const isDiscovery = status.startsWith(discoveryPrefix);

  return {
    showLoadingUI: isLoading,
    isDiscovery,
  };
}
