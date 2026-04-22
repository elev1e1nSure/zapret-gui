import { useService } from "./hooks/useService";
import { TitleBar } from "./components/TitleBar";
import { StatusHeader } from "./components/StatusHeader";
import { PowerButton } from "./components/PowerButton";
import { StrategySelector } from "./components/StrategySelector";
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
    toggleService
  } = useService();

  return (
    <div 
      className={`app-window ${isActive ? "active" : ""} ${showLoadingUI ? "detecting" : ""}`} 
      id="appWindow"
    >
      <TitleBar isActive={isActive} showLoadingUI={showLoadingUI} />

      <StatusHeader status={status} dots={dots} />

      <PowerButton 
        isActive={isActive}
        isLoading={isLoading}
        showLoadingUI={showLoadingUI}
        isExiting={isExiting}
        isDropdownOpen={isDropdownOpen}
        toggleService={toggleService}
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
  );
}

export default App;
