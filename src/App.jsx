import { useState, useRef } from "react";
import { useService } from "./hooks/useService";
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
    dots,
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

    // Start reveal animation
    setTransitionOverlay({
      x,
      y,
      theme: newTheme,
      isFading: false
    });

    // Step 1: Switch the theme state when the circle covers enough area (~450ms)
    setTimeout(() => {
      setTheme(newTheme);
    }, 450);

    // Step 2: Start fading out the overlay (~850ms)
    setTimeout(() => {
      setTransitionOverlay(prev => prev ? { ...prev, isFading: true } : null);
    }, 850);

    // Step 3: Remove overlay completely (~1250ms)
    overlayTimeoutRef.current = setTimeout(() => {
      setTransitionOverlay(null);
      overlayTimeoutRef.current = null;
    }, 1250);
  };

  return (
    <div 
      className={`app-window ${theme === "light" ? "theme-light" : ""} ${isActive ? "active" : ""} ${showLoadingUI ? "detecting" : ""}`} 
      id="appWindow"
    >
      <TitleBar isActive={isActive} showLoadingUI={showLoadingUI} isMinimizeToTray={isMinimizeToTray} />

      <div className={`screen-container ${currentScreen === "main" ? "show-main" : "show-settings"}`}>
        <div className="main-screen-content">
          <StatusHeader status={status} dots={dots} />

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
          onThemeToggle={handleThemeToggle}
          theme={theme}
          isAutostart={isAutostart}
          onAutostartToggle={toggleAutostart}
          isAutoConnect={isAutoConnect}
          onAutoConnectToggle={toggleAutoConnect}
          isMinimizeToTray={isMinimizeToTray}
          onMinimizeToTrayToggle={toggleMinimizeToTray}
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
