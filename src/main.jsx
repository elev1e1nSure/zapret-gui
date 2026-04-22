import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Блокировка контекстного меню
window.addEventListener('contextmenu', (e) => e.preventDefault(), true);

// Блокировка горячих клавиш для ощущения нативного приложения
window.addEventListener('keydown', (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const code = e.code;

  // Список блокируемых кодов клавиш
  const blockedCodes = [
    'KeyF', 'KeyG', 'KeyR', 'KeyP', 'KeyS', 'KeyU', 'KeyI', 'KeyJ', 'KeyC', 'KeyO'
  ];

  if (
    // Одиночные клавиши
    code === 'F5' || code === 'F12' || code === 'F3' ||
    // Ctrl + Key
    (isCtrl && blockedCodes.includes(code)) ||
    // Alt + Стрелки
    (e.altKey && (code === 'ArrowLeft' || code === 'ArrowRight'))
  ) {
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
