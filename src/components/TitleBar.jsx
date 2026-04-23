import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export function TitleBar({ isMinimizeToTray }) {
  const handleMinimize = (e) => {
    e.stopPropagation();
    getCurrentWindow().minimize();
  };

  const handleClose = async (e) => {
    e.stopPropagation();
    
    if (isMinimizeToTray !== false) {
      await getCurrentWindow().close();
    } else {
      await invoke("exit_app");
    }
  };

  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region
    >
      <div className="titlebar-drag-region" data-tauri-drag-region></div>
      
      <div className="titlebar-controls">
        <div 
          className="titlebar-button" 
          onClick={handleMinimize}
          onPointerDown={(e) => e.stopPropagation()}
        >
          &#8211;
        </div>
        <div 
          className="titlebar-button" 
          id="titlebar-close" 
          onClick={handleClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          &#215;
        </div>
      </div>
    </div>
  );
}
