import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { STRATEGIES, TOOLTIPS, APP_VERSION } from "../config";

function TooltipIcon({ id, text, openId, setOpenId, theme }) {
  const isVisible = openId === id;
  const [shouldRender, setShouldRender] = useState(false);
  const iconRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }

    setShouldRender(true);

    const icon = iconRef.current;
    if (!icon) return;

    const panel = icon.closest(".settings-screen");

    const computePosition = () => {
      if (!iconRef.current) return;
      const rect = iconRef.current.getBoundingClientRect();
      const tooltipWidth = 220;
      const screenWidth = window.innerWidth;
      const padding = 40;
      const centerBias = -14;
      const iconCenter = rect.left + rect.width / 2;
      let clampedCenter = iconCenter + centerBias;
      if (clampedCenter + tooltipWidth / 2 > screenWidth - padding)
        clampedCenter = screenWidth - padding - tooltipWidth / 2;
      if (clampedCenter - tooltipWidth / 2 < padding)
        clampedCenter = padding + tooltipWidth / 2;
      setCoords({ top: rect.top, left: clampedCenter, arrowShift: iconCenter - clampedCenter });
    };

    // Fire scroll + initial position in the same frame — no delay, browser smooth handles inertia
    const frame = requestAnimationFrame(() => {
      if (iconRef.current && panel) {
        const iconRect = iconRef.current.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const TOOLTIP_HEIGHT = 160;
        const FADE_ZONE = 36;
        const TOP_SAFE = 8;

        const estimatedTooltipTop = iconRect.top - 22 - TOOLTIP_HEIGHT;
        let scrollDelta = 0;

        if (estimatedTooltipTop < panelRect.top + TOP_SAFE) {
          scrollDelta = estimatedTooltipTop - (panelRect.top + TOP_SAFE);
        } else if (iconRect.bottom > panelRect.bottom - FADE_ZONE) {
          scrollDelta = iconRect.bottom - (panelRect.bottom - FADE_ZONE);
        }

        if (Math.abs(scrollDelta) > 2) {
          panel.scrollBy({ top: scrollDelta, behavior: "smooth" });
        }
      }
      computePosition();
    });

    // Re-compute position after scroll animation settles
    const settleTimer = setTimeout(computePosition, 420);

    panel?.addEventListener("scroll", computePosition, { passive: true });
    window.addEventListener("resize", computePosition);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      panel?.removeEventListener("scroll", computePosition);
      window.removeEventListener("resize", computePosition);
    };
  }, [isVisible]);

  const content = (
    <>
      <div 
        className={`tooltip-bubble ${isVisible ? "fade-in" : "fade-out"} ${theme === "light" ? "theme-light" : ""}`}
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
  const exclusionsWrapperRef = useRef(null);
  const exclusionsContentRef = useRef(null);
  const allStrategies = STRATEGIES.filter(s => s.value !== "auto");

  useEffect(() => {
    const wrapper = exclusionsWrapperRef.current;
    const content = exclusionsContentRef.current;
    if (!wrapper || !content) return;
    if (isStrategiesExpanded) {
      wrapper.style.height = `${content.scrollHeight}px`;
    } else {
      wrapper.style.height = "0px";
    }
  }, [isStrategiesExpanded]);
  
  // Prevent scrolling while a tooltip is open (backdrop active)
  useEffect(() => {
    if (!openTooltipId) return;

    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const prevent = (e) => {
      e.preventDefault();
    };

    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      window.removeEventListener("wheel", prevent);
      window.removeEventListener("touchmove", prevent);
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [openTooltipId]);

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
    <div className={`settings-screen ${openTooltipId ? "tooltip-open" : ""}`}>
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
                theme={theme}
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
                theme={theme}
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
                theme={theme}
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
                theme={theme}
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
              theme={theme}
            />
          </div>
          <svg className="collapse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div className={`collapsible-wrapper ${isStrategiesExpanded ? "expanded" : ""}`} ref={exclusionsWrapperRef}>
          <div className="collapsible-content" ref={exclusionsContentRef}>
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

        <div className="settings-group">
          <div
            className={`settings-item-wide clear-cache-item clear-cache-item-top ${clearCacheState}`}
            onClick={handleClearCache}
          >
            <span className={`settings-item-label centered ${isClearCacheLabelFading ? "fade" : ""}`}>
              {clearCacheLabel}
            </span>
          </div>
          <div
            className={`settings-item-wide clear-cache-item ${resetAppDataState}`}
            onClick={handleResetAppData}
          >
            <span className={`settings-item-label centered ${isResetAppDataLabelFading ? "fade" : ""}`}>
              {resetAppDataLabel}
            </span>
          </div>
        </div>

        <div className="settings-version">v{APP_VERSION}</div>
      </div>
    </div>
  );
}
