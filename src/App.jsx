import { useCallback, useEffect, useRef, useState } from "react";
import { useService } from "./hooks/useService";
import { THEME_TRANSITION } from "./config";
import { TitleBar } from "./components/TitleBar";
import { StatusHeader } from "./components/StatusHeader";
import { PowerButton } from "./components/PowerButton";
import { SettingsScreen } from "./components/SettingsScreen";
import "./App.css";

function App() {
  const {
    isActive,
    status,
    isLoading,
    showLoadingUI,
    isExiting,
    toggleService,
    theme,
    setTheme,
    isAutostart,
    toggleAutostart,
    isAutoConnect,
    toggleAutoConnect,
    isMinimizeToTray,
    toggleMinimizeToTray,
    resetAppData,
    resetKnowledge,
    currentScreen,
    setCurrentScreen,
  } = useService();

  const [transitionOverlay, setTransitionOverlay] = useState(null);
  const overlayTimeoutRef = useRef(null);
  const themeSwitchTimeoutsRef = useRef([]);

  const clearThemeSwitchTimers = () => {
    for (const id of themeSwitchTimeoutsRef.current) {
      clearTimeout(id);
    }
    themeSwitchTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearThemeSwitchTimers();
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    };
  }, []);

  const handleThemeToggle = (e) => {
    if (overlayTimeoutRef.current) return;

    const newTheme = theme === "dark" ? "light" : "dark";
    const x = typeof e?.clientX === "number" ? e.clientX : window.innerWidth / 2;
    const y = typeof e?.clientY === "number" ? e.clientY : window.innerHeight / 2;

    const { REVEAL_MS, FADE_MS } = THEME_TRANSITION;
    clearThemeSwitchTimers();

    setTransitionOverlay({ x, y, theme: newTheme, isFading: false });

    // Switch theme halfway through the reveal so it's hidden under the expanding circle
    const themeTimer = setTimeout(() => setTheme(newTheme), Math.round(REVEAL_MS * 0.5));
    themeSwitchTimeoutsRef.current.push(themeTimer);

    // Start fading the overlay once the circle has fully expanded
    const fadeTimer = setTimeout(() => {
      setTransitionOverlay(prev => (prev ? { ...prev, isFading: true } : null));
    }, REVEAL_MS + 65);
    themeSwitchTimeoutsRef.current.push(fadeTimer);

    // Remove overlay DOM node after fade completes
    overlayTimeoutRef.current = setTimeout(() => {
      setTransitionOverlay(null);
      overlayTimeoutRef.current = null;
      clearThemeSwitchTimers();
    }, REVEAL_MS + FADE_MS + 30);
  };

  const handleOpenSettings = useCallback(() => setCurrentScreen("settings"), [setCurrentScreen]);
  const handleCloseSettings = useCallback(() => setCurrentScreen("main"), [setCurrentScreen]);

  return (
    <div
      className={`app-window ${theme === "light" ? "theme-light" : ""} ${isActive ? "active" : ""} ${showLoadingUI ? "detecting" : ""}`}
      id="appWindow"
    >
      <TitleBar isMinimizeToTray={isMinimizeToTray} />

      <div className={`screen-container ${currentScreen === "main" ? "show-main" : "show-settings"}`}>
        <div className="main-screen-content">
          <StatusHeader status={status} />

          <PowerButton
            isActive={isActive}
            isLoading={isLoading}
            showLoadingUI={showLoadingUI}
            isExiting={isExiting}
            toggleService={toggleService}
            onSettingsClick={handleOpenSettings}
          />
        </div>

        <SettingsScreen
          onBack={handleCloseSettings}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          isAutostart={isAutostart}
          onAutostartToggle={toggleAutostart}
          isAutoConnect={isAutoConnect}
          onAutoConnectToggle={toggleAutoConnect}
          isMinimizeToTray={isMinimizeToTray}
          onMinimizeToTrayToggle={toggleMinimizeToTray}
          onResetAppData={resetAppData}
          onResetKnowledge={resetKnowledge}
        />
      </div>

      {transitionOverlay && (
        <div className={`theme-reveal-overlay ${transitionOverlay.isFading ? "fade-out" : ""}`}>
          <div
            className="theme-reveal-circle animate"
            style={{
              left: transitionOverlay.x,
              top: transitionOverlay.y,
              backgroundColor: transitionOverlay.theme === "light" ? "#eef1f4" : "#2b2d31",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
