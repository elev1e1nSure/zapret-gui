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

export const TIMEOUTS = {
  UI_SPINNER_DELAY: 50, // Минимальная задержка для мгновенного отклика
  AUTO_CONNECT_DELAY: 1000,
  TRAY_SYNC_DELAY: 500,
  PROCESS_FINALIZE_DELAY: 300,
  DOTS_ANIMATION_INTERVAL: 800,
};

export const APP_STATUS = {
  READY: () => "Zapret готов к запуску",
  DISCOVERY: () => "Подбор стратегии",
  RUNNING: (label) => `${label} запущен`,
  MATCHED: (label) => `${label} подобран`,
  STOPPING: () => "Остановка...",
  ERROR: (err) => `Ошибка: ${err}`,
  DISCOVERY_ABORTED: () => "Поиск отменен",
};
