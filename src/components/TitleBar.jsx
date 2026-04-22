import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar({ isActive, showLoadingUI }) {
  const handlePointerDown = (e) => {
    if (e.buttons === 1 && 
        !e.target.closest(".titlebar-button") && 
        !e.target.closest(".power-button") &&
        !e.target.closest(".strategy-select")) {
      appWindow.startDragging();
    }
  };

  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region
      onPointerDown={handlePointerDown}
    >
      <div data-tauri-drag-region className="titlebar-drag-region"></div>
      
      <div className="titlebar-controls">
        <div 
          className="titlebar-button" 
          onClick={() => appWindow.minimize()}
        >
          &#8211;
        </div>
        <div 
          className="titlebar-button" 
          id="titlebar-close" 
          onClick={() => appWindow.close()}
        >
          &#215;
        </div>
      </div>
    </div>
  );
}
