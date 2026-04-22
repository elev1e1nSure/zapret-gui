import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Блокировка контекстного меню
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Блокировка горячих клавиш
document.addEventListener('keydown', (e) => {
  // F5, Ctrl+R, Ctrl+Shift+R (Перезагрузка)
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
    e.preventDefault();
  }
  // Ctrl+F (Поиск)
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
  }
  // F12, Ctrl+Shift+I (DevTools)
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
  }
  // Ctrl+P (Печать), Ctrl+S (Сохранение), Ctrl+U (Исходный код)
  if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) {
    e.preventDefault();
  }
  // Ctrl+Shift+C (Инспектор)
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
  }
  // Alt+Left/Right (Навигация назад/вперед)
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
