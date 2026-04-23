import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { STRATEGIES, TOOLTIPS } from "../config";

function TooltipIcon({ id, text, openId, setOpenId }) {
  const isVisible = openId === id;
  const [shouldRender, setShouldRender] = useState(false);
  const iconRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Используем requestAnimationFrame для синхронизации анимации появления
      const frame = requestAnimationFrame(() => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          const tooltipWidth = 220;
          const screenWidth = window.innerWidth;
          const padding = 40;
          const centerBias = -14; // Slightly shift tooltips left for better balance
          
          const iconCenter = rect.left + rect.width / 2;
          let desiredCenter = iconCenter + centerBias;
          let clampedCenter = desiredCenter;

          // Проверка выхода за правый край
          if (clampedCenter + tooltipWidth / 2 > screenWidth - padding) {
            clampedCenter = (screenWidth - padding) - tooltipWidth / 2;
          }
          // Проверка выхода за левый край
          if (clampedCenter - tooltipWidth / 2 < padding) {
            clampedCenter = padding + tooltipWidth / 2;
          }

          setCoords({
            top: rect.top,
            left: clampedCenter,
            // Keep arrow exactly over the (real) icon center, even if tooltip is clamped.
            arrowShift: iconCenter - clampedCenter
          });
        }
      });
      return () => cancelAnimationFrame(frame);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const content = (
    <>
      <div 
        className={`tooltip-bubble ${isVisible ? "fade-in" : "fade-out"}`}
        style={{ 
          top: `${coords.top - 22}px`, 
          left: `${coords.left}px`,
          position: 'fixed'
        }}
      >
        {text}
        <div 
          className="tooltip-arrow" 
          style={{ transform: `translate(calc(-50% + ${coords.arrowShift}px), -50%) rotate(45deg)` }}
        />
      </div>
    </>
  );

  return (
    <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
      <div 
        ref={iconRef}
        className={`info-icon ${isVisible ? "active" : ""}`}
        onClick={() => setOpenId(isVisible ? null : id)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      {shouldRender && createPortal(content, document.body)}
    </div>
  );
}

export function SettingsScreen({ 
  onBack, 
  onThemeToggle, 
  theme, 
  isAutostart, 
  onAutostartToggle,
  isAutoConnect,
  onAutoConnectToggle,
  isMinimizeToTray,
  onMinimizeToTrayToggle,
  isGameFilter,
  onGameFilterToggle,
  excludedStrategies,
  onToggleExcluded
}) {
  const [isStrategiesExpanded, setIsStrategiesExpanded] = useState(false);
  const [openTooltipId, setOpenTooltipId] = useState(null);
  const allStrategies = STRATEGIES.filter(s => s.value !== "auto");
  
  const handleToggleAll = (enable) => {
    allStrategies.forEach(s => {
      const isCurrentlyExcluded = excludedStrategies.includes(s.value);
      if (enable && isCurrentlyExcluded) {
        onToggleExcluded(s.value);
      } else if (!enable && !isCurrentlyExcluded) {
        onToggleExcluded(s.value);
      }
    });
  };

  return (
    <div className="settings-screen">
      {openTooltipId && (
        <div
          className="tooltip-backdrop fade-in"
          onClick={() => setOpenTooltipId(null)}
        />
      )}
      <div className="settings-header">
        <div className="settings-header-left">
          <button 
            className="back-button" 
            onClick={onBack}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h2 className="settings-title">Настройки</h2>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-group">
          <div className="settings-item-wide theme-toggle-item" onClick={onThemeToggle}>
            <span className="settings-item-label centered">
              {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            </span>
          </div>

          <div className={`settings-item-wide ${openTooltipId === "autostart" ? "tooltip-focus" : ""}`} onClick={onAutostartToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Автозагрузка</span>
              <TooltipIcon
                id="autostart"
                text={TOOLTIPS.AUTOSTART}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
              />
            </div>
            <div className={`toggle-switch ${isAutostart ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className={`settings-item-wide ${openTooltipId === "autoconnect" ? "tooltip-focus" : ""}`} onClick={onAutoConnectToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Включить при запуске</span>
              <TooltipIcon
                id="autoconnect"
                text={TOOLTIPS.AUTOCONNECT}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
              />
            </div>
            <div className={`toggle-switch ${isAutoConnect ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className={`settings-item-wide ${openTooltipId === "minimize" ? "tooltip-focus" : ""}`} onClick={onMinimizeToTrayToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Сворачивать в трей</span>
              <TooltipIcon
                id="minimize"
                text={TOOLTIPS.MINIMIZE_TRAY}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
              />
            </div>
            <div className={`toggle-switch ${isMinimizeToTray ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className={`settings-item-wide ${openTooltipId === "gamefilter" ? "tooltip-focus" : ""}`} onClick={onGameFilterToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Игровой фильтр</span>
              <TooltipIcon
                id="gamefilter"
                text={TOOLTIPS.GAME_FILTER}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
              />
            </div>
            <div className={`toggle-switch ${isGameFilter ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>
        </div>

        <div 
          className={`settings-group-header collapsible ${isStrategiesExpanded ? "expanded" : ""} ${openTooltipId === "exclusions" ? "tooltip-focus" : ""}`}
          onClick={() => setIsStrategiesExpanded(!isStrategiesExpanded)}
        >
          <div className="settings-item-left">
            <div className="settings-group-title">Исключения автоподбора</div>
            <TooltipIcon
              id="exclusions"
              text={TOOLTIPS.DISCOVERY_EXCLUSIONS}
              openId={openTooltipId}
              setOpenId={setOpenTooltipId}
            />
          </div>
          <svg className="collapse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div className={`collapsible-wrapper ${isStrategiesExpanded ? "expanded" : ""}`}>
          <div className="collapsible-content">
            <div className="settings-group-actions-row">
              <div className="settings-group-actions">
                <button className="compact-action-button" onClick={() => handleToggleAll(true)}>ВКЛ</button>
                <div className="action-divider"></div>
                <button className="compact-action-button" onClick={() => handleToggleAll(false)}>ВЫКЛ</button>
              </div>
            </div>
            <div className="strategies-grid">
              {allStrategies.map(strategy => (
                <div 
                  key={strategy.value} 
                  className={`strategy-badge ${excludedStrategies.includes(strategy.value) ? "excluded" : "active"}`}
                  onClick={() => onToggleExcluded(strategy.value)}
                >
                  {strategy.label.replace("General ", "G").replace("Fake TLS Auto", "TLS").replace("Simple Fake", "SF")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
