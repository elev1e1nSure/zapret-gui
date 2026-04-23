import { useEffect, useState } from "react";

const identity = (v) => v;

/**
 * useState backed by localStorage under the given key.
 *
 * Survives storage failures (private mode, quota, disabled storage) by
 * logging a warning and keeping the in-memory state consistent.
 */
export function usePersistedState(key, defaultValue, options = {}) {
  const {
    serialize = identity,
    deserialize = identity,
  } = options;

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return deserialize(raw);
    } catch (err) {
      console.warn(`[Storage] Failed to read "${key}":`, err);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch (err) {
      console.warn(`[Storage] Failed to persist "${key}":`, err);
    }
    // `serialize` is intentionally excluded: callers pass inline functions
    // and we only care about value/key changes here.
  }, [key, value]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue];
}
