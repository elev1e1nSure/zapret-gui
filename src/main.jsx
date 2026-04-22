import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Блокировка контекстного меню и горячих клавиш для ощущения нативного приложения
window.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });

window.addEventListener('keydown', (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  const { code } = e;

  // Список блокируемых кодов клавиш
  const blockedCodes = ['KeyF', 'KeyG', 'KeyR', 'KeyP', 'KeyS', 'KeyU', 'KeyI', 'KeyJ', 'KeyC', 'KeyO'];
  const blockedSingles = ['F3', 'F5', 'F12'];

  const shouldBlock = 
    blockedSingles.includes(code) || 
    (isCtrl && blockedCodes.includes(code)) ||
    (e.altKey && (code === 'ArrowLeft' || code === 'ArrowRight'));

  if (shouldBlock) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
}, { capture: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
