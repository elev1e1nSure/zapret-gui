export const STRATEGIES = [
  { label: "Автоподбор", value: "auto" },
  { label: "General", value: "general_silent.bat" },
  { label: "General ALT", value: "general (ALT)_silent.bat" },
  { label: "General ALT 2", value: "general (ALT2)_silent.bat" },
  { label: "General ALT 3", value: "general (ALT3)_silent.bat" },
  { label: "General ALT 4", value: "general (ALT4)_silent.bat" },
  { label: "General ALT 5", value: "general (ALT5)_silent.bat" },
  { label: "General ALT 6", value: "general (ALT6)_silent.bat" },
  { label: "General ALT 7", value: "general (ALT7)_silent.bat" },
  { label: "General ALT 8", value: "general (ALT8)_silent.bat" },
  { label: "General ALT 9", value: "general (ALT9)_silent.bat" },
  { label: "General ALT 10", value: "general (ALT10)_silent.bat" },
  { label: "General ALT 11", value: "general (ALT11)_silent.bat" },
  { label: "Fake TLS Auto", value: "general (FAKE TLS AUTO)_silent.bat" },
  { label: "Fake TLS Auto ALT", value: "general (FAKE TLS AUTO ALT)_silent.bat" },
  { label: "Fake TLS Auto ALT 2", value: "general (FAKE TLS AUTO ALT2)_silent.bat" },
  { label: "Fake TLS Auto ALT 3", value: "general (FAKE TLS AUTO ALT3)_silent.bat" },
  { label: "Simple Fake", value: "general (SIMPLE FAKE)_silent.bat" },
  { label: "Simple Fake ALT", value: "general (SIMPLE FAKE ALT)_silent.bat" },
  { label: "Simple Fake ALT 2", value: "general (SIMPLE FAKE ALT2)_silent.bat" },
];

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
  RUNNING: (label) => `${label} запущен`,
  MATCHED: (label) => `${label} запущен`,
  STOPPING: () => "Остановка...",
  ERROR: (err) => `Ошибка: ${err}`,
  DISCOVERY_ABORTED: () => "Поиск отменен",
};

// Must match AppError::DiscoveryAborted::error_type() on the Rust side.
export const DISCOVERY_ABORTED_TYPE = "DiscoveryAborted";

export const STORAGE_KEYS = {
  STRATEGY: "zapret_strategy",
  THEME: "zapret_theme",
  AUTOCONNECT: "zapret_autoconnect",
  MINIMIZE_TO_TRAY: "zapret_minimize_to_tray",
  EXCLUDED: "zapret_excluded_strategies",
  GAME_FILTER: "zapret_game_filter",
  LAST_WORKING_STRATEGY: "zapret_last_working_strategy",
};

export const TOOLTIPS = {
  AUTOSTART: "Приложение будет запускаться само при включении ПК. Не нужно открывать его вручную каждый раз.",
  AUTOCONNECT: "После запуска приложение сразу включает выбранный режим, чтобы всё работало без лишних действий.",
  MINIMIZE_TRAY: "Кнопка закрытия не выключает программу, а прячет её в трей. Удобно, если хотите, чтобы она работала в фоне.",
  GAME_FILTER: "Убирает игровые порты из обхода, чтобы не трогать игровой трафик и избежать лагов в играх.",
  DISCOVERY_EXCLUSIONS:
  "Здесь можно отметить стратегии, которые автоподбор должен пропускать.",
  CLEAR_CACHE:
  "Очищает кэш рабочих стратегий автоподбора. Используйте, если хотите начать подбор с нуля.",
  RESET_SETTINGS:
  "Сбрасывает локальные настройки приложения к значениям по умолчанию.",
};
