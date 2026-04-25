import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { STRATEGIES, TOOLTIPS, APP_VERSION } from "../config";

function TooltipAnchor({
  id,
  text,
  openId,
  setOpenId,
  theme,
  hoverDelay = 360,
  tooltipOffsetY = -22,
  className = "",
  onClick,
  children,
}) {
  const isVisible = openId === id;
  const [shouldRender, setShouldRender] = useState(false);
  const anchorRef = useRef(null);
  const [portalHost, setPortalHost] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
    setShouldRender(true);

    const anchor = anchorRef.current;
    if (!anchor) return;

    const panel = anchor.closest(".settings-screen");
    if (!panel) return;
    setPortalHost(panel);

    const computePosition = () => {
      if (!anchorRef.current || !panel) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const tooltipWidth = 220;
      const panelRect = panel.getBoundingClientRect();
      const padding = 16;
      const anchorCenterInPanel = rect.left - panelRect.left + rect.width / 2;
      let clampedCenter = anchorCenterInPanel;
      if (clampedCenter + tooltipWidth / 2 > panel.clientWidth - padding) {
        clampedCenter = panel.clientWidth - padding - tooltipWidth / 2;
      }
      if (clampedCenter - tooltipWidth / 2 < padding) {
        clampedCenter = padding + tooltipWidth / 2;
      }

      const iconTopInPanel = rect.top - panelRect.top + panel.scrollTop;
      const top = iconTopInPanel + tooltipOffsetY;

      setCoords({
        top,
        left: clampedCenter,
      });
    };

    computePosition();
    panel.addEventListener("scroll", computePosition, { passive: true });
    window.addEventListener("resize", computePosition);

    return () => {
      panel.removeEventListener("scroll", computePosition);
      window.removeEventListener("resize", computePosition);
    };
  }, [isVisible, tooltipOffsetY]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const openWithDelay = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setOpenId(id);
      hoverTimerRef.current = null;
    }, hoverDelay);
  };

  const closeTooltip = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (openId === id) {
      setOpenId(null);
    }
  };

  const content = (
    <div
      className={`tooltip-bubble tooltip-in-panel tooltip-above ${isVisible ? "fade-in" : "fade-out"} ${theme === "light" ? "theme-light" : ""}`}
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        position: "absolute",
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      ref={anchorRef}
      className={className}
      onClick={onClick}
      onMouseEnter={openWithDelay}
      onMouseLeave={closeTooltip}
    >
      {children}
      {shouldRender && portalHost && createPortal(content, portalHost)}
    </div>
  );
}

function TooltipIcon({ id, text, openId, setOpenId, theme }) {
  return (
    <TooltipAnchor
      id={id}
      text={text}
      openId={openId}
      setOpenId={setOpenId}
      theme={theme}
      className="tooltip-container"
      hoverDelay={360}
      tooltipOffsetY={-22}
    >
      <div
        className={`info-icon ${openId === id ? "active" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
    </TooltipAnchor>
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
  onToggleExcluded,
  onClearCache,
  onResetAppData
}) {
  const [isStrategiesExpanded, setIsStrategiesExpanded] = useState(false);
  const [openTooltipId, setOpenTooltipId] = useState(null);
  const [clearCacheLabel, setClearCacheLabel] = useState("Очистить кэш");
  const [clearCacheState, setClearCacheState] = useState("idle"); // idle | success | error
  const [isClearCacheLabelFading, setIsClearCacheLabelFading] = useState(false);
  const clearCacheTimerRef = useRef(null);
  const [resetAppDataLabel, setResetAppDataLabel] = useState("Сбросить настройки");
  const [resetAppDataState, setResetAppDataState] = useState("idle"); // idle | success | error
  const [isResetAppDataLabelFading, setIsResetAppDataLabelFading] = useState(false);
  const resetAppDataTimerRef = useRef(null);
  const allStrategies = STRATEGIES.filter(s => s.value !== "auto");
  
  const setClearCacheLabelAnimated = (nextLabel) => {
    setIsClearCacheLabelFading(true);
    setTimeout(() => {
      // Both updates are batched in one commit: text changes while invisible,
      // then the CSS transition fades it back in.
      setClearCacheLabel(nextLabel);
      setIsClearCacheLabelFading(false);
    }, 110);
  };

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

  const handleClearCache = async (e) => {
    e.stopPropagation();

    try {
      const ok = await onClearCache?.();
      if (ok === false) {
        throw new Error("clear-cache-failed");
      }

      setClearCacheState("success");
      setClearCacheLabelAnimated("Очищено");
    } catch {
      setClearCacheState("error");
      setClearCacheLabelAnimated("Не удалось");
    }

    if (clearCacheTimerRef.current) {
      clearTimeout(clearCacheTimerRef.current);
    }
    clearCacheTimerRef.current = setTimeout(() => {
      setClearCacheState("idle");
      setClearCacheLabelAnimated("Очистить кэш");
      clearCacheTimerRef.current = null;
    }, 1600);
  };

  const setResetAppDataLabelAnimated = (nextLabel) => {
    setIsResetAppDataLabelFading(true);
    setTimeout(() => {
      setResetAppDataLabel(nextLabel);
      setIsResetAppDataLabelFading(false);
    }, 110);
  };

  const handleResetAppData = async (e) => {
    e.stopPropagation();

    try {
      const ok = await onResetAppData?.();
      if (ok === false) {
        throw new Error("reset-app-data-failed");
      }

      setResetAppDataState("success");
      setResetAppDataLabelAnimated("Настройки сброшены");
    } catch {
      setResetAppDataState("error");
      setResetAppDataLabelAnimated("Не удалось");
    }

    if (resetAppDataTimerRef.current) {
      clearTimeout(resetAppDataTimerRef.current);
    }
    resetAppDataTimerRef.current = setTimeout(() => {
      setResetAppDataState("idle");
      setResetAppDataLabelAnimated("Сбросить настройки");
      resetAppDataTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (clearCacheTimerRef.current) {
        clearTimeout(clearCacheTimerRef.current);
      }
      if (resetAppDataTimerRef.current) {
        clearTimeout(resetAppDataTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="settings-screen">
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

          <div className="settings-item-wide" onClick={onAutostartToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Автозагрузка</span>
              <TooltipIcon
                id="autostart"
                text={TOOLTIPS.AUTOSTART}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
                theme={theme}
              />
            </div>
            <div className={`toggle-switch ${isAutostart ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="settings-item-wide" onClick={onAutoConnectToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Включить при запуске</span>
              <TooltipIcon
                id="autoconnect"
                text={TOOLTIPS.AUTOCONNECT}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
                theme={theme}
              />
            </div>
            <div className={`toggle-switch ${isAutoConnect ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="settings-item-wide" onClick={onMinimizeToTrayToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Сворачивать в трей</span>
              <TooltipIcon
                id="minimize"
                text={TOOLTIPS.MINIMIZE_TRAY}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
                theme={theme}
              />
            </div>
            <div className={`toggle-switch ${isMinimizeToTray ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="settings-item-wide" onClick={onGameFilterToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Игровой фильтр</span>
              <TooltipIcon
                id="gamefilter"
                text={TOOLTIPS.GAME_FILTER}
                openId={openTooltipId}
                setOpenId={setOpenTooltipId}
                theme={theme}
              />
            </div>
            <div className={`toggle-switch ${isGameFilter ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>
        </div>

        <TooltipAnchor
          id="exclusions"
          text={TOOLTIPS.DISCOVERY_EXCLUSIONS}
          openId={openTooltipId}
          setOpenId={setOpenTooltipId}
          theme={theme}
          hoverDelay={680}
          tooltipOffsetY={-8}
          className={`settings-group-header collapsible ${isStrategiesExpanded ? "expanded" : ""}`}
          onClick={() => {
            const nextExpanded = !isStrategiesExpanded;
            setIsStrategiesExpanded(nextExpanded);
          }}
        >
          <div className="settings-item-left">
            <div className="settings-group-title">Исключения автоподбора</div>
          </div>
          <svg className="collapse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </TooltipAnchor>

        <div
          className={`collapsible-wrapper ${isStrategiesExpanded ? "expanded" : ""}`}
        >
          <div className="collapsible-content">
            <div className="settings-group-actions-row">
              <div className="settings-group-actions">
                <button className="compact-action-button" onClick={() => handleToggleAll(true)}>ВКЛ</button>
                <div className="action-divider"></div>
                <button className="compact-action-button" onClick={() => handleToggleAll(false)}>ВЫКЛ</button>
              </div>
            </div>
            <div className="strategies-grid">
              {allStrategies.map(strategy => {
                const isExcluded = excludedStrategies.includes(strategy.value);

                return (
                  <div 
                    key={strategy.value} 
                    className={`strategy-badge ${isExcluded ? "excluded" : "active"}`}
                    onClick={() => {
                      onToggleExcluded(strategy.value);
                    }}
                  >
                    <span className="strategy-badge-label">
                      {strategy.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <TooltipAnchor
            id="clear-cache"
            text={TOOLTIPS.CLEAR_CACHE}
            openId={openTooltipId}
            setOpenId={setOpenTooltipId}
            theme={theme}
            hoverDelay={680}
            tooltipOffsetY={-8}
            className={`settings-item-wide clear-cache-item clear-cache-item-top ${clearCacheState}`}
            onClick={handleClearCache}
          >
            <div className="settings-item-left settings-item-left-centered">
              <span className={`settings-item-label ${isClearCacheLabelFading ? "fade" : ""}`}>
                {clearCacheLabel}
              </span>
            </div>
          </TooltipAnchor>
          <TooltipAnchor
            id="reset-settings"
            text={TOOLTIPS.RESET_SETTINGS}
            openId={openTooltipId}
            setOpenId={setOpenTooltipId}
            theme={theme}
            hoverDelay={680}
            tooltipOffsetY={-8}
            className={`settings-item-wide clear-cache-item ${resetAppDataState}`}
            onClick={handleResetAppData}
          >
            <div className="settings-item-left settings-item-left-centered">
              <span className={`settings-item-label ${isResetAppDataLabelFading ? "fade" : ""}`}>
                {resetAppDataLabel}
              </span>
            </div>
          </TooltipAnchor>
        </div>

        <div className="settings-version">v{APP_VERSION}</div>
      </div>
    </div>
  );
}
