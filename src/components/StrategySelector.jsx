import { useEffect, useRef } from "react";
import { STRATEGIES } from "../config";
import { getLastWorkingStrategy } from "../utils/strategyCache";

export function StrategySelector({ 
  selectedStrategy, 
  setSelectedStrategy, 
  isActive, 
  isLoading,
  isDropdownOpen,
  setIsDropdownOpen,
  excludedStrategies = [],
}) {
  const dropdownRef = useRef(null);
  const cachedStrategy = getLastWorkingStrategy();

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
    <div className={`strategy-container ${(isActive || isLoading) ? "hidden" : ""}`} ref={dropdownRef}>
      <div 
        className={`strategy-select ${isDropdownOpen ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive && !isLoading) {
            const nextOpen = !isDropdownOpen;
            setIsDropdownOpen(nextOpen);
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
      
      <div
        className={`strategy-dropdown ${isDropdownOpen ? "open" : ""}`}
      >
        {STRATEGIES.map((strategy) => {
          const isSelected = selectedStrategy === strategy.value;
          const isExcluded = excludedStrategies.includes(strategy.value);
          const isCached = cachedStrategy === strategy.value;

          return (
            <div 
              key={strategy.value}
              className={`strategy-option ${isSelected ? "active" : ""} ${isExcluded ? "excluded" : ""} ${isCached ? "cached" : ""}`}
              onClick={() => selectStrategy(strategy.value)}
            >
              <span>{strategy.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
