import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STRATEGIES } from "../config";
import { getLastWorkingStrategy } from "../utils/strategyCache";

function StateInfoHint({ id, text, openId, setOpenId }) {
  const isVisible = openId === id;
  const [shouldRender, setShouldRender] = useState(false);
  const iconRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowShift: 0 });

  useEffect(() => {
    if (!isVisible) {
      const t = setTimeout(() => setShouldRender(false), 180);
      return () => clearTimeout(t);
    }
    setShouldRender(true);

    const update = () => {
      const icon = iconRef.current;
      if (!icon) return;
      const rect = icon.getBoundingClientRect();
      const tooltipWidth = 220;
      const padding = 40;
      const centerBias = -32;
      const center = rect.left + rect.width / 2;
      let left = center + centerBias;
      if (left + tooltipWidth / 2 > window.innerWidth - padding) {
        left = window.innerWidth - padding - tooltipWidth / 2;
      }
      if (left - tooltipWidth / 2 < padding) {
        left = padding + tooltipWidth / 2;
      }
      setCoords({ top: rect.top - 8, left, arrowShift: center - left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [id, isVisible]);

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        className={`info-icon strategy-state-info ${isVisible ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpenId(isVisible ? null : id);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
      {shouldRender && createPortal(
        <div
          className={`tooltip-bubble ${isVisible ? "fade-in" : "fade-out"}`}
          style={{ top: `${coords.top}px`, left: `${coords.left}px`, position: "fixed" }}
        >
          {text}
          <div
            className="tooltip-arrow"
            style={{ transform: `translate(calc(-50% + ${coords.arrowShift}px), -50%) rotate(45deg)` }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

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
  const [openHintId, setOpenHintId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setOpenHintId(null);
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
    setOpenHintId(null);
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
            if (!nextOpen) {
              setOpenHintId(null);
            }
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
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setOpenHintId(null);
          }
        }}
      >
        {STRATEGIES.map((strategy) => {
          const isSelected = selectedStrategy === strategy.value;
          const isExcluded = excludedStrategies.includes(strategy.value);
          const isCached = cachedStrategy === strategy.value;
          const hint = isExcluded
            ? "Исключена из автоподбора. Нажмите, чтобы использовать вручную."
            : isCached
              ? "Эта стратегия отмечена как рабочая на вашем устройстве."
              : "";

          return (
            <div 
              key={strategy.value}
              className={`strategy-option ${isSelected ? "active" : ""}`}
              onClick={() => selectStrategy(strategy.value)}
            >
              <span>{strategy.label}</span>
              {hint && (
                <StateInfoHint
                  id={`selector-${strategy.value}`}
                  text={hint}
                  openId={openHintId}
                  setOpenId={setOpenHintId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
