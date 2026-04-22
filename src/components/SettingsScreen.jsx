export function SettingsScreen({ 
  onBack, 
  onThemeToggle, 
  theme, 
  isAutostart, 
  onAutostartToggle,
  isAutoConnect,
  onAutoConnectToggle
}) {
  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 className="settings-title">Настройки</h2>
        <div style={{ width: 24 }}></div> {/* Spacer for symmetry */}
      </div>

      <div className="settings-content">
        <div className="settings-group">
          <div className="settings-item-wide" onClick={onThemeToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Тёмная тема</span>
            </div>
            <div className={`toggle-switch ${theme === "dark" ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="settings-item-wide" onClick={onAutostartToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Автозагрузка</span>
            </div>
            <div className={`toggle-switch ${isAutostart ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="settings-item-wide" onClick={onAutoConnectToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Включить при запуске</span>
            </div>
            <div className={`toggle-switch ${isAutoConnect ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
