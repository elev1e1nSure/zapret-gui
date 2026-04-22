# Zapret-GUI

![Main Window](./assets/screen1.png)
![Strategy Selector](./assets/screen2.png)

Простая и удобная оболочка для [утилиты zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube). Больше не нужно вручную перебирать десятки батников — приложение само запустит службу и поможет найти рабочую конфигурацию.

## Что умеет
- **Запуск в один клик:** Без всякой возни.
- **Умный автоподбор:** Сам переберет стратегии и найдет ту, которая заработает у вас.
- **Тихая работа:** Программа сворачивается в трей и может работать в фоновом режиме.
- **Автоматизация:** Может запускаться вместе с Windows и само подключаться при старте.
- **Стильный UI:** Дизайн в духе Discord с темной и светлой темами.

## Стек
- **Backend:** Rust / Tauri v2
- **Frontend:** React

## Как собрать самому

### Что понадобится
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)

### Инструкция
1. Клонируем:
   ```bash
   git clone https://github.com/elev1e1nSure/zapret-gui.git
   cd zapret-gui
   ```
2. Ставим зависимости:
   ```bash
   pnpm install
   ```
3. Запускаем для тестов:
   ```bash
   pnpm tauri dev
   ```
4. Собираем готовый файл:
   ```bash
   pnpm tauri build
   ```
Готовый билд появится здесь: `src-tauri/target/release`.