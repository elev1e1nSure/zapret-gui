import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const appWindow = getCurrentWindow();

function App() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Zapret готов к запуску");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("auto");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dots, setDots] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(false);

  const strategies = [
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

  const activeStrategyLabel = strategies.find(s => s.value === selectedStrategy)?.label || "Custom";

  useEffect(() => {
    if (!isLoading) {
      setShowLoadingUI(false);
      return;
    }

    if (selectedStrategy === "auto") {
      setShowLoadingUI(true);
      return;
    }

    const timeout = setTimeout(() => setShowLoadingUI(true), 500);
    return () => clearTimeout(timeout);
  }, [isLoading, selectedStrategy]);

  useEffect(() => {
    if (showLoadingUI && status.startsWith("Подбор стратегии")) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "." : prev + "."));
      }, 800);
      return () => clearInterval(interval);
    }
    setDots("");
  }, [showLoadingUI, status]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const abortDiscovery = async () => {
    abortControllerRef.current = true;
    setIsExiting(true);
    setStatus("Zapret готов к запуску");

    try {
      await invoke("abort_auto_discovery");
    } catch (error) {
      // Ignore error during abort
    }
    
    setTimeout(() => {
      setIsLoading(false);
      setShowLoadingUI(false);
      setIsExiting(false);
    }, 300);
  };

  const toggleService = async () => {
    if (isLoading) {
      await abortDiscovery();
      return;
    }

    if (isActive) {
      setIsActive(false);
      setIsLoading(true);
      setIsExiting(true);
      setStatus("Zapret готов к запуску");

      try {
        await invoke("stop_batch");
        setTimeout(() => {
          setIsLoading(false);
          setShowLoadingUI(false);
          setIsExiting(false);
        }, 300);
      } catch (error) {
        setStatus(`Ошибка остановки: ${error}`);
        setIsLoading(false);
        setIsExiting(false);
      }
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = false;
    
    try {
      if (selectedStrategy === "auto") {
        setStatus("Подбор стратегии");
        const strategyValues = strategies
          .filter(s => s.value !== "auto")
          .map(s => s.value);
        
        const bestStrategy = await invoke("run_auto_discovery", { strategies: strategyValues });
        
        if (!abortControllerRef.current) {
          setSelectedStrategy(bestStrategy);
          setIsActive(true);
          const label = strategies.find(s => s.value === bestStrategy)?.label || "Custom";
          setStatus(`${label} подобран`);
        }
      } else {
        await invoke("run_batch", { name: selectedStrategy });
        setIsActive(true);
        setStatus(`${activeStrategyLabel} запущен`);
      }
    } catch (error) {
      if (!abortControllerRef.current && error !== "Поиск отменен") {
        setIsActive(false);
        setStatus(`Ошибка: ${error}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointerDown = (e) => {
    if (e.buttons === 1 && 
        !e.target.closest(".titlebar-button") && 
        !e.target.closest(".power-button") &&
        !e.target.closest(".strategy-select")) {
      appWindow.startDragging();
    }
  };

  const selectStrategy = (val) => {
    setSelectedStrategy(val);
    setIsDropdownOpen(false);
  };

  const currentStrategyLabel = strategies.find(s => s.value === selectedStrategy)?.label;

  return (
    <div 
      className={`app-window ${isActive ? "active" : ""} ${showLoadingUI ? "detecting" : ""}`} 
      id="appWindow"
    >
      <div 
        className="titlebar" 
        data-tauri-drag-region
        onPointerDown={handlePointerDown}
      >
        <div data-tauri-drag-region className="titlebar-drag-region"></div>
        <div 
          className="titlebar-button" 
          onClick={() => appWindow.minimize()}
          title="Свернуть"
        >
          &#8211;
        </div>
        <div 
          className="titlebar-button" 
          id="titlebar-close" 
          onClick={() => appWindow.close()}
          title="Закрыть"
        >
          &#215;
        </div>
      </div>

      <div 
        className="header" 
        data-tauri-drag-region
        onPointerDown={handlePointerDown}
      >
        <h1 data-tauri-drag-region>Zapret</h1>
        <p className="status-text" id="statusText" data-tauri-drag-region>
          {status}{dots}
        </p>
      </div>

      <div className="power-button-container">
        <button 
          className={`power-button ${showLoadingUI ? "loading" : ""}`} 
          id="powerBtn" 
          onClick={toggleService}
        >
          {showLoadingUI ? (
            <div className={`spinner ${isExiting ? "fade-out" : ""}`}></div>
          ) : (
            <svg
              className="power-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          )}
        </button>
      </div>

      <div className="strategy-container" ref={dropdownRef}>
        <div 
          className={`strategy-select ${isDropdownOpen ? "open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            !isActive && setIsDropdownOpen(!isDropdownOpen);
          }}
          style={{ cursor: isActive ? "default" : "pointer" }}
        >
          <span className="selected-label">
            {currentStrategyLabel}
          </span>
          <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        
        <div className={`strategy-dropdown ${isDropdownOpen ? "open" : ""}`}>
          {strategies.map((strategy) => (
            <div 
              key={strategy.value}
              className={`strategy-option ${selectedStrategy === strategy.value ? "active" : ""}`}
              onClick={() => selectStrategy(strategy.value)}
            >
              {strategy.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
