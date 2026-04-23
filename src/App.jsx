import { useState, useRef } from "react";
import { useService } from "./hooks/useService";
import { THEME_TRANSITION } from "./config";
import { TitleBar } from "./components/TitleBar";
import { StatusHeader } from "./components/StatusHeader";
import { PowerButton } from "./components/PowerButton";
import { StrategySelector } from "./components/StrategySelector";
import { SettingsScreen } from "./components/SettingsScreen";
import "./App.css";

function App() {
  const {
    isActive,
    status,
    isLoading,
    showLoadingUI,
    selectedStrategy,
    setSelectedStrategy,
    isExiting,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleService,
    theme,
    setTheme,
    isAutostart,
    toggleAutostart,
    isAutoConnect,
    toggleAutoConnect,
    isMinimizeToTray,
    toggleMinimizeToTray,
    isGameFilter,
    toggleGameFilter,
    excludedStrategies,
    toggleExcludedStrategy,
    clearStrategyCache,
    currentScreen,
    setCurrentScreen
  } = useService();

  const [transitionOverlay, setTransitionOverlay] = useState(null);
  const overlayTimeoutRef = useRef(null);

  const handleThemeToggle = (e) => {
    if (overlayTimeoutRef.current) return;

    const newTheme = theme === "dark" ? "light" : "dark";
    const x = e.clientX;
    const y = e.clientY;

    const { REVEAL_MS, FADE_MS } = THEME_TRANSITION;

    setTransitionOverlay({ x, y, theme: newTheme, isFading: false });

    // Switch theme halfway through the reveal so it's hidden under the expanding circle
    setTimeout(() => setTheme(newTheme), Math.round(REVEAL_MS * 0.5));

    // Start fading the overlay once the circle has fully expanded
    setTimeout(() => {
      setTransitionOverlay(prev => (prev ? { ...prev, isFading: true } : null));
    }, REVEAL_MS + 65);

    // Remove overlay DOM node after fade completes
    overlayTimeoutRef.current = setTimeout(() => {
      setTransitionOverlay(null);
      overlayTimeoutRef.current = null;
    }, REVEAL_MS + FADE_MS + 30);
  };

  return (
    <div 
      className={`app-window ${theme === "light" ? "theme-light" : ""} ${isActive ? "active" : ""} ${showLoadingUI ? "detecting" : ""}`} 
      id="appWindow"
    >
      <TitleBar isActive={isActive} showLoadingUI={showLoadingUI} isMinimizeToTray={isMinimizeToTray} />

      <div className={`screen-container ${currentScreen === "main" ? "show-main" : "show-settings"}`}>
        <div className="main-screen-content">
          <StatusHeader status={status} />

          <PowerButton 
            isActive={isActive}
            isLoading={isLoading}
            showLoadingUI={showLoadingUI}
            isExiting={isExiting}
            isDropdownOpen={isDropdownOpen}
            toggleService={toggleService}
            theme={theme}
            onSettingsClick={() => setCurrentScreen("settings")}
          />

          <StrategySelector 
            selectedStrategy={selectedStrategy}
            setSelectedStrategy={setSelectedStrategy}
            isActive={isActive}
            isLoading={isLoading}
            isExiting={isExiting}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
          />
        </div>

        <SettingsScreen 
            onBack={() => setCurrentScreen("main")}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            isAutostart={isAutostart}
            onAutostartToggle={toggleAutostart}
            isAutoConnect={isAutoConnect}
            onAutoConnectToggle={toggleAutoConnect}
            isMinimizeToTray={isMinimizeToTray}
            onMinimizeToTrayToggle={toggleMinimizeToTray}
            isGameFilter={isGameFilter}
            onGameFilterToggle={toggleGameFilter}
            excludedStrategies={excludedStrategies}
            onToggleExcluded={toggleExcludedStrategy}
            onClearCache={clearStrategyCache}
          />
      </div>

      {transitionOverlay && (
        <div className={`theme-reveal-overlay ${transitionOverlay.isFading ? "fade-out" : ""}`}>
          <div 
            className="theme-reveal-circle animate" 
            style={{ 
              left: transitionOverlay.x, 
              top: transitionOverlay.y,
              backgroundColor: transitionOverlay.theme === "light" ? "#ffffff" : "#2b2d31"
            }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default App;
