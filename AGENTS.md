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
├── main.ts          # Точка входа
├── agent/           # Ядро агента (AI логика)
├── cli/             # CLI интерфейс
├── config/          # Конфигурация (ENV -> KV -> DEFAULTS)
├── dashboard/       # Web-дашборд (Hono)
└── tgbot/           # Telegram бот (Grammy)
```

## Конфигурация

Приоритет: **ENV -> KV -> DEFAULTS**

| Переменная           | Описание                                   | Default         |
| -------------------- | ------------------------------------------ | --------------- |
| DEEPSEEK_API_KEY     | API ключ DeepSeek                          | —               |
| DEEPSEEK_MODEL_NAME  | Модель DeepSeek                            | `deepseek-chat` |
| TELEGRAM_BOT_API_KEY | Токен Telegram бота                        | —               |
| TELEGRAM_CODE        | Код для авторизации владельца              | —               |
| TELEGRAM_USER_ID     | ID владельца (устанавливается через /code) | —               |

Скопировать `.env.example` в `.env` и заполнить значения.

## Запуск

```bash
deno task dev   # Запуск с hot-reload
deno task test  # Тесты
deno task check # Type-check
deno task lint  # Линтер
deno task fmt   # Форматирование
```

## Telegram бот

Команды:

| Команда        | Описание                                           |
| -------------- | -------------------------------------------------- |
| `/start`       | Приветствие                                        |
| `/ping`        | Проверка работы бота                               |
| `/code <code>` | Авторизация владельца (сравнивает с TELEGRAM_CODE) |
| `/config`      | Показать конфиг (только для владельца)             |

После успешной авторизации через `/code` бот запоминает `user_id` как владельца.

## Алиасы импортов

**ВАЖНО:** При импорте внутренних модулей использовать алиасы из `deno.json`:

| Алиас     | Путь                     |
| --------- | ------------------------ |
| `#config` | `./source/config/mod.ts` |
| `#tgbot`  | `./source/tgbot/mod.ts`  |
| `#agent`  | `./source/agent/mod.ts`  |

```typescript
// Правильно
import { getTelegramBotApiKey } from "#config";

// Неправильно
import { getTelegramBotApiKey } from "../config/mod.ts";
```

## TODO

- [ ] Реализовать ядро агента (source/agent/)
- [ ] Создать CLI интерфейс (source/cli/)
- [x] Реализовать Telegram бот (source/tgbot/)
- [ ] Создать Web Dashboard (source/dashboard/)
- [ ] Интеграция с DeepSeek API
- [ ] Добавить систему промптов
- [ ] Реализовать память агента
