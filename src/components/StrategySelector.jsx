import { useEffect, useRef } from "react";
import { STRATEGIES } from "../config";

export function StrategySelector({ 
  selectedStrategy, 
  setSelectedStrategy, 
  isActive, 
  isLoading,
  isExiting,
  isDropdownOpen,
  setIsDropdownOpen
}) {
  const dropdownRef = useRef(null);

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
  }, [isDropdownOpen, setIsDropdownOpen]);

  const selectStrategy = (val) => {
    setSelectedStrategy(val);
    setIsDropdownOpen(false);
  };

  const currentStrategyLabel = STRATEGIES.find(s => s.value === selectedStrategy)?.label;

  return (
    <div className={`strategy-container ${(isActive || (isLoading && !isExiting)) ? "hidden" : ""}`} ref={dropdownRef}>
      <div 
        className={`strategy-select ${isDropdownOpen ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive && !isLoading) {
            setIsDropdownOpen(!isDropdownOpen);
          }
        }}
        style={{ cursor: (isActive || isLoading) ? "default" : "pointer" }}
      >
        <span className="selected-label">
          {currentStrategyLabel}
        </span>
        <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      
      <div className={`strategy-dropdown ${isDropdownOpen ? "open" : ""}`}>
        {STRATEGIES.map((strategy) => (
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
  );
}
