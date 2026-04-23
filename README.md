# Zapret-GUI

![Main Window](./assets/screen1.png)
![Strategy Selector](./assets/screen2.png)

Простая оболочка для [zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube). Больше не нужно вручную перебирать батники — приложение само запустит нужную стратегию или найдёт рабочую самостоятельно.

## Что умеет

- **Запуск в один клик** — выбираешь стратегию и жмёшь кнопку, или доверяешь автоподбору.
- **Умный автоподбор** — перебирает стратегии, проверяет соединение и останавливается на первой рабочей.
- **Гибкие настройки** — автозапуск с Windows, автоподключение при старте, фоновый режим в трее, игровой фильтр и тонкая настройка автоподбора.
- **Тёмная и светлая тема.**

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
3. Запускаем для разработки:
   ```bash
   pnpm tauri dev
   ```
4. Собираем релиз:
   ```bash
   pnpm tauri build
   ```

Готовый exe появится в `src-tauri/target/release/zapret-gui.exe`.

## Ссылки

- [zapret](https://github.com/bol-van/zapret) — оригинальный проект, первоисточник
- [zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube) — сборка под Windows, движок которой использует это приложение