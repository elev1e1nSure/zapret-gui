import { useCallback, useEffect, useRef, useState } from "react";
import { useService } from "./hooks/useService";
import { THEME_TRANSITION } from "./config";
import { TitleBar } from "./components/TitleBar";
import { StatusHeader } from "./components/StatusHeader";
import { PowerButton } from "./components/PowerButton";
import { StrategySelector } from "./components/StrategySelector";
import { SettingsScreen } from "./components/SettingsScreen";
import "./App.css";

const FEEDBACK_DELAY_MS = 3000;
const FEEDBACK_SWAP_DELAY_MS = 220;
const TOAST_DURATION_MS = 1900;
const TOAST_FADE_OUT_MS = 260;

function App() {
  const {
    isActive,
    reportBadStrategy,
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
    resetAppData,
    currentScreen,
    setCurrentScreen,
  } = useService();
  const isSelectedStrategyExcluded = excludedStrategies.includes(selectedStrategy);

  const [transitionOverlay, setTransitionOverlay] = useState(null);
  const overlayTimeoutRef = useRef(null);
  const themeSwitchTimeoutsRef = useRef([]);

  // "Плохо работает?" button state
  const [showFeedbackButton, setShowFeedbackButton] = useState(false);
  const [isFeedbackButtonClosing, setIsFeedbackButtonClosing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(false);
  const [isFeedbackToastClosing, setIsFeedbackToastClosing] = useState(false);
  const feedbackTimerRef = useRef(null);
  const feedbackSwapTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const toastCloseTimerRef = useRef(null);

  // Show the button after a delay for any active connection.
  useEffect(() => {
    clearTimeout(feedbackTimerRef.current);
    if (isActive && !showLoadingUI && !isSelectedStrategyExcluded) {
      feedbackTimerRef.current = setTimeout(() => {
        setShowFeedbackButton(true);
      }, FEEDBACK_DELAY_MS);
    } else {
      setShowFeedbackButton(false);
      setIsFeedbackButtonClosing(false);
      setFeedbackToast(false);
      setIsFeedbackToastClosing(false);
    }
    return () => clearTimeout(feedbackTimerRef.current);
  }, [isActive, showLoadingUI, isSelectedStrategyExcluded]);

  const handleBadStrategy = useCallback(() => {
    setIsFeedbackButtonClosing(true);
    clearTimeout(feedbackSwapTimerRef.current);
    clearTimeout(toastTimerRef.current);
    clearTimeout(toastCloseTimerRef.current);

    // Start transition to discovery immediately, while the small button finishes its exit animation.
    reportBadStrategy(selectedStrategy);

    feedbackSwapTimerRef.current = setTimeout(() => {
      setShowFeedbackButton(false);
      setIsFeedbackButtonClosing(false);
      setFeedbackToast(true);
      setIsFeedbackToastClosing(false);
      toastTimerRef.current = setTimeout(() => {
        setIsFeedbackToastClosing(true);
        toastCloseTimerRef.current = setTimeout(() => {
          setFeedbackToast(false);
          setIsFeedbackToastClosing(false);
        }, TOAST_FADE_OUT_MS);
      }, TOAST_DURATION_MS);
    }, FEEDBACK_SWAP_DELAY_MS);
  }, [reportBadStrategy, selectedStrategy]);

  useEffect(() => {
    return () => {
      clearTimeout(feedbackTimerRef.current);
      clearTimeout(feedbackSwapTimerRef.current);
      clearTimeout(toastTimerRef.current);
      clearTimeout(toastCloseTimerRef.current);
    };
  }, []);

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
            isDropdownOpen={isDropdownOpen}
            toggleService={toggleService}
            onSettingsClick={handleOpenSettings}
          />

          <StrategySelector
            selectedStrategy={selectedStrategy}
            setSelectedStrategy={setSelectedStrategy}
            isActive={isActive}
            isLoading={isLoading}
            isExiting={isExiting}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            excludedStrategies={excludedStrategies}
          />

          <div className="feedback-anchor">
            {showFeedbackButton && (
              <button
                className={`feedback-btn ${isFeedbackButtonClosing ? "closing" : ""}`}
                onClick={handleBadStrategy}
              >
                Плохо работает?
              </button>
            )}
            {feedbackToast && (
              <div className={`feedback-toast ${isFeedbackToastClosing ? "closing" : ""}`}>
                Стратегия исключена,<br />ищем следующую
              </div>
            )}
          </div>
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
          isGameFilter={isGameFilter}
          onGameFilterToggle={toggleGameFilter}
          excludedStrategies={excludedStrategies}
          onToggleExcluded={toggleExcludedStrategy}
          onClearCache={clearStrategyCache}
          onResetAppData={resetAppData}
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
