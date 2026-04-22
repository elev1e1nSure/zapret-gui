import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Блокировка контекстного меню
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Блокировка горячих клавиш для ощущения нативного приложения
document.addEventListener('keydown', (e) => {
  // Перезагрузка: F5, Ctrl+R, Ctrl+Shift+R
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
    e.preventDefault();
  }
  // Поиск: Ctrl+F
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
  }
  // DevTools: F12, Ctrl+Shift+I
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
  }
  // Системные действия: Ctrl+P (Печать), Ctrl+S (Сохранить), Ctrl+U (Исходный код)
  if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) {
    e.preventDefault();
  }
  // Инспектор: Ctrl+Shift+C
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
  }
  // Навигация: Alt+Left/Right
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
