import { STORAGE_KEYS } from "../config";

export function getLastWorkingStrategy() {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_WORKING_STRATEGY);
  } catch {
    return null;
  }
}

export function setLastWorkingStrategy(strategy) {
  if (!strategy) return;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_WORKING_STRATEGY, strategy);
  } catch (err) {
    console.warn("[Storage] Failed to cache working strategy:", err);
  }
}

export function clearStrategyCache() {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_WORKING_STRATEGY);
    return true;
  } catch {
    return false;
  }
}

export function prioritizeCached(strategies) {
  const cached = getLastWorkingStrategy();
  if (!cached || !strategies.includes(cached)) return strategies;
  return [cached, ...strategies.filter(s => s !== cached)];
}
