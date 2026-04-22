export function StatusHeader({ status, dots }) {
  return (
    <div className="header" data-tauri-drag-region>
      <a 
        href="https://github.com/elev1e1nSure/zapret-gui" 
        target="_blank" 
        rel="noopener noreferrer"
        className="header-link"
      >
        <h1>Zapret</h1>
      </a>
      <p 
        className="status-text" 
        id="statusText" 
        data-tauri-drag-region
        key={status}
      >
        {status}{dots}
      </p>
    </div>
  );
}
