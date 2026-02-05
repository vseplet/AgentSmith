# AgentSmith

## Описание проекта

AgentSmith — мультиинтерфейсная AI-агентная платформа с поддержкой различных
способов взаимодействия:

- **DeepSeek LLM** — интеграция с языковой моделью
- **Telegram Bot** — интерфейс через Telegram
- **Web Dashboard** — веб-панель для управления
- **CLI** — интерфейс командной строки

## Технологический стек

| Компонент     | Технология               |
| ------------- | ------------------------ |
| Runtime       | Deno + TypeScript        |
| Web Framework | Hono.js                  |
| Bot           | Grammy (Telegram)        |
| LLM           | Vercel AI SDK + DeepSeek |
| Validation    | Zod                      |
| Storage       | Deno KV                  |

## Библиотеки и пакеты

### Внутренние (@vseplet/)

| Пакет             | Версия | Назначение                                                     |
| ----------------- | ------ | -------------------------------------------------------------- |
| @vseplet/fetchify | 0.4.0  | HTTP запросы с валидацией схем                                 |
| @vseplet/luminous | 2.2.1  | Логирование и форматирование                                   |
| @vseplet/morph    | 1.1.0  | Zero-build fullstack библиотека для web UI с SSR (HTMX + Hono) |
| @vseplet/shibui   | 1.7.1  | Workflow automation engine — Pots, Tasks, Workflows с Deno KV  |

### Внешние

| Пакет      | Версия | Назначение             |
| ---------- | ------ | ---------------------- |
| @hono/hono | 4.11.7 | Web-фреймворк          |
| ai         | 6.0.71 | Vercel AI SDK для LLM  |
| grammy     | latest | Telegram bot framework |
| zod        | 4.3.6  | Валидация схем         |

## Структура проекта

```
source/
├── mod.ts           # Главный модуль
├── agent/           # Ядро агента (AI логика)
├── cli/             # CLI интерфейс
├── config/          # Конфигурация (Deno KV)
├── dashboard/       # Web-дашборд (Hono)
└── tgbot/           # Telegram бот (Grammy)
```

## TODO

- [ ] Реализовать ядро агента (source/agent/)
- [ ] Создать CLI интерфейс (source/cli/)
- [ ] Реализовать Telegram бот (source/tgbot/)
- [ ] Создать Web Dashboard (source/dashboard/)
- [ ] Интеграция с DeepSeek API
- [ ] Добавить систему промптов
- [ ] Реализовать память агента
