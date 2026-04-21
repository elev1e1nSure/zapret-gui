import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const appWindow = getCurrentWindow();

function App() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Zapret готов к запуску");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("general (ALT)_silent.bat");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeStrategyLabel, setActiveStrategyLabel] = useState("");

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const strategies = [
    { label: "Standard", value: "general_silent.bat" },
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

  const toggleService = async () => {
    if (isActive) {
      setIsLoading(true);
      try {
        await invoke("stop_batch");
        setIsActive(false);
        setActiveStrategyLabel("");
        setStatus("Zapret остановлен");
      } catch (error) {
        console.error("Failed to stop batch:", error);
        setStatus(`Ошибка остановки: ${error}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    
    try {
      await invoke("run_batch", { name: selectedStrategy });
      setIsActive(true);
      const label = strategies.find(s => s.value === selectedStrategy)?.label || "Custom";
      setActiveStrategyLabel(label);
      setStatus(`${label} запущен`);
    } catch (error) {
      console.error("Failed to run batch:", error);
      setStatus(`Ошибка: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointerDown = (e) => {
    // Check if we are left-clicking on a drag region but NOT on a button or dropdown
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

  return (
    <div 
      className={`app-window ${isActive ? "active" : ""} ${isLoading ? "detecting" : ""}`} 
      id="appWindow"
    >
      {/* Custom Titlebar */}
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
          {status}
        </p>
      </div>

      <div className="power-button-container">
        <button 
          className={`power-button ${isLoading ? "loading" : ""}`} 
          id="powerBtn" 
          onClick={toggleService}
          disabled={isLoading}
        >
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
        </button>
      </div>

      {/* Strategy Selector */}
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
            {strategies.find(s => s.value === selectedStrategy)?.label}
          </span>
          <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        
        {isDropdownOpen && (
          <div className="strategy-dropdown">
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
        )}
      </div>
    </div>
  );
}

export default App;
