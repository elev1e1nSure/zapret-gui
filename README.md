# Zapret-GUI

<p align="center">
  <img src="https://img.shields.io/github/v/release/elev1e1nSure/zapret-gui?style=flat-square&color=6e5494" alt="Release">
  <img src="https://img.shields.io/github/license/elev1e1nSure/zapret-gui?style=flat-square&color=41cd52" alt="License">
  <img src="https://img.shields.io/github/downloads/elev1e1nSure/zapret-gui/total?style=flat-square&color=007acc" alt="Downloads">
</p>

<p align="center">
  <a href="https://github.com/elev1e1nSure/zapret-gui/releases/latest">
    <img src="https://img.shields.io/badge/Скачать-Последнюю%20версию-007acc?style=for-the-badge&logo=windows&logoColor=white" alt="Скачать">
  </a>
</p>

<p align="center">
  <img src="./assets/screen1.png" width="45%" alt="Главное окно" />
  <img src="./assets/screen2.png" width="45%" alt="Настройки" />
</p>

---

Графический интерфейс для настройки и запуска обхода блокировок YouTube и Discord на Windows. Больше не нужно ковыряться в консоли и вручную перебирать .bat файлы — приложение всё сделает само.

## Возможности

> [!TIP]
> ### Основной функционал
> * **Запуск в один клик** — выбор режима и старт одной кнопкой.
> * **Умный автоподбор** — автоматический перебор стратегий и проверка соединения до первого рабочего варианта.

> [!NOTE]
> ### Автоматизация и комфорт
> * **Фоновый режим** — работа из системного трея, автозапуск вместе с Windows и подключение при старте.
> * **Игровой фильтр** — оптимизация трафика, чтобы не ломать пинг в онлайн-играх.
> * **Интерфейс** — современный дизайн с поддержкой тёмной и светлой тем.

---

## Быстрый старт

> [!IMPORTANT]
> 1. Скачай актуальную версию по кнопке выше или со страницы **[Releases](https://github.com/elev1e1nSure/zapret-gui/releases)** (файл `zapret-gui.exe`).
> 2. Запусти приложение от имени Администратора для корректной настройки сетевого драйвера.
> 3. Нажми кнопку автоподбора или выбери готовую стратегию вручную.

---

## Разработка

### Требования

- Windows 10/11
- Node.js 22+
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (latest stable)

### Установка

```powershell
pnpm install
```

### Запуск в dev-режиме

```powershell
pnpm tauri dev
```

### Тесты и линтинг

```powershell
# Frontend
pnpm lint
pnpm test

# Rust (из директории src-tauri/)
cd src-tauri
cargo test
cargo clippy
```

### Релизы

Релизы публикуются автоматически при пуше тега `v*`:

```powershell
git tag v1.5.2
git push origin v1.5.2
```

Workflow запускает тесты и собирает `.exe` инсталлятор.

## Документация

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — архитектура и data flow
- [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) — стиль кода (JS + Rust)
- [`docs/PROJECT_RULES.md`](docs/PROJECT_RULES.md) — правила коммитов, версионирование, безопасность
- [`claude.md`](claude.md) — контекст для AI-ассистентов

## Ссылки

* [Оригинальный zapret](https://github.com/bol-van/zapret) — движок, на котором основана работа.
* [Сборка от Flowseal](https://github.com/Flowseal/zapret-discord-youtube) — адаптированная Windows-версия, используемая в приложении.

<p align="center"><sub>Проект распространяется по лицензии MIT.</sub></p>