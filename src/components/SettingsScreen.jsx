import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../config";

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
  onResetAppData,
  onResetKnowledge,
}) {
  const [resetAppDataLabel, setResetAppDataLabel] = useState("Сбросить настройки");
  const [resetAppDataState, setResetAppDataState] = useState("idle");
  const [isResetAppDataLabelFading, setIsResetAppDataLabelFading] = useState(false);
  const resetAppDataTimerRef = useRef(null);

  const [resetKnowledgeLabel, setResetKnowledgeLabel] = useState("Сбросить память ядра");
  const [resetKnowledgeState, setResetKnowledgeState] = useState("idle");
  const [isResetKnowledgeLabelFading, setIsResetKnowledgeLabelFading] = useState(false);
  const resetKnowledgeTimerRef = useRef(null);

  const setResetAppDataLabelAnimated = (nextLabel) => {
    setIsResetAppDataLabelFading(true);
    setTimeout(() => {
      setResetAppDataLabel(nextLabel);
      setIsResetAppDataLabelFading(false);
    }, 110);
  };

  const setResetKnowledgeLabelAnimated = (nextLabel) => {
    setIsResetKnowledgeLabelFading(true);
    setTimeout(() => {
      setResetKnowledgeLabel(nextLabel);
      setIsResetKnowledgeLabelFading(false);
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

  const handleResetKnowledge = async (e) => {
    if (typeof e.button === "number" && e.button !== 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try {
      const ok = await onResetKnowledge?.();
      if (ok) {
        setResetKnowledgeState("success");
        setResetKnowledgeLabelAnimated("Память сброшена");
      } else {
        throw new Error("reset-failed");
      }
    } catch {
      setResetKnowledgeState("error");
      setResetKnowledgeLabelAnimated("Не удалось");
    }

    if (resetKnowledgeTimerRef.current) clearTimeout(resetKnowledgeTimerRef.current);
    resetKnowledgeTimerRef.current = setTimeout(() => {
      setResetKnowledgeState("idle");
      setResetKnowledgeLabelAnimated("Сбросить память ядра");
      resetKnowledgeTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (resetAppDataTimerRef.current) {
        clearTimeout(resetAppDataTimerRef.current);
      }
      if (resetKnowledgeTimerRef.current) {
        clearTimeout(resetKnowledgeTimerRef.current);
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

          <div className="settings-item-wide" onClick={onMinimizeToTrayToggle}>
            <div className="settings-item-left">
              <span className="settings-item-label">Сворачивать в трей</span>
            </div>
            <div className={`toggle-switch ${isMinimizeToTray ? "active" : ""}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div
            className={`settings-item-wide clear-cache-item clear-cache-item-top ${resetKnowledgeState}`}
            onPointerDown={handleResetKnowledge}
          >
            <div className="settings-item-left settings-item-left-centered">
              <span className={`settings-item-label ${isResetKnowledgeLabelFading ? "fade" : ""}`}>
                {resetKnowledgeLabel}
              </span>
            </div>
          </div>
          <div
            className={`settings-item-wide clear-cache-item ${resetAppDataState}`}
            onClick={handleResetAppData}
          >
            <div className="settings-item-left settings-item-left-centered">
              <span className={`settings-item-label ${isResetAppDataLabelFading ? "fade" : ""}`}>
                {resetAppDataLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-version">v{APP_VERSION}</div>
      </div>
    </div>
  );
}
