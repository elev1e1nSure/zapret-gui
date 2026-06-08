// Injected by Vite at build time from package.json
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export const TIMEOUTS = {
  UI_SPINNER_DELAY: 50,
  AUTO_CONNECT_DELAY: 1000,
  PROCESS_FINALIZE_DELAY: 300,
};

// Must stay in sync with CSS animation/transition durations in App.css
export const THEME_TRANSITION = {
  REVEAL_MS: 550,  // circularReveal animation duration
  FADE_MS: 400,    // .theme-reveal-overlay transition duration
};

export const APP_STATUS = {
  READY: () => "Zapret не запущен",
  DISCOVERY: (label, index, total) => {
    if (!label) return "Подбор";
    if (index && total) return `Подбор: ${label} (${index}/${total})`;
    return `Подбор: ${label}`;
  },
  RUNNING: () => "Обход запущен",
  MATCHED: () => "Обход запущен",
  STOPPING: () => "Остановка...",
  ERROR: (err) => `Ошибка: ${err}`,
  DISCOVERY_ABORTED: () => "Поиск отменен",
};

// Must match AppError::DiscoveryAborted::error_type() on the Rust side.
export const DISCOVERY_ABORTED_TYPE = "DiscoveryAborted";

export const STORAGE_KEYS = {
  THEME: "zapret_theme",
  AUTOCONNECT: "zapret_autoconnect",
  MINIMIZE_TO_TRAY: "zapret_minimize_to_tray",
};
