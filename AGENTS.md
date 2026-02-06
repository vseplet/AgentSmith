# AgentSmith

AI-агент в образе Агента Смита из Матрицы с интеграцией DeepSeek LLM и Telegram.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.ts                                  │
│                    (точка входа)                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│  agent/loops  │◄──────────│   channels/   │
│   (Shibui)    │  Pots     │   telegram    │
└───────┬───────┘           └───────────────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  llms/deepseek│────►│    tools/*    │     │  agent/utils  │
│  (fetchify)   │     │ (12 tools)    │     │ memory/logger │
└───────────────┘     └───────────────┘     └───────────────┘
```

## Как это работает

1. **Telegram** получает сообщение от владельца
2. **Shibui** создаёт `TelegramMessage` pot и отправляет в очередь
3. **HandleTelegramMessage** task обрабатывает pot:
   - Отправляет "⏳ Thinking..." в ответ
   - Вызывает DeepSeek LLM с набором tools
   - Обновляет сообщение прогрессом выполнения tools
   - Отправляет финальный ответ
4. **Memory** сохраняет контекст диалога в Deno KV
5. **Logger** логирует все взаимодействия в файлы

## Структура проекта

```
source/
├── main.ts                    # Точка входа
├── types.ts                   # Все типы проекта
├── agent/
│   ├── loops/mod.ts           # Shibui pots & tasks
│   ├── profiles/              # Профили агента (промпты)
│   ├── session.ts             # Сессии
│   └── utils/
│       ├── memory.ts          # Память (Deno KV)
│       └── logger.ts          # Логирование
├── channels/
│   └── telegram/              # Telegram бот (Grammy)
│       ├── mod.ts
│       └── helpers.ts
├── cli/mod.ts                 # CLI интерфейс
├── config/mod.ts              # Конфигурация
├── llms/
│   └── deepseek.ts            # DeepSeek API (fetchify + valibot)
└── tools/                     # Инструменты агента
    ├── uptime.ts              # Время работы системы
    ├── system.ts              # Информация о системе
    ├── ps.ts                  # Список процессов
    ├── claude.ts              # Вызов Claude CLI
    ├── websearch.ts           # Веб-поиск
    ├── moltbook.ts            # Moltbook API
    ├── logsearch.ts           # Поиск по логам
    ├── eval.ts                # Выполнение JS кода
    ├── glock17.ts             # Glock17 API
    └── http-services.ts       # HTTP сервисы (wttr, rate.sx, cheat.sh)
```

## Технологический стек

| Компонент  | Технология                           |
| ---------- | ------------------------------------ |
| Runtime    | Deno + TypeScript                    |
| Bot        | Grammy (Telegram)                    |
| LLM        | DeepSeek API (fetchify + valibot)    |
| Workflow   | Shibui (Pots, Tasks)                 |
| Storage    | Deno KV                              |
| Validation | Valibot                              |

## Библиотеки (@vseplet/)

| Пакет             | Назначение                                    |
| ----------------- | --------------------------------------------- |
| @vseplet/fetchify | HTTP клиент с rate-limiting                   |
| @vseplet/shibui   | Workflow engine (Pots, Tasks, Deno KV)        |
| @vseplet/luminous | Логирование                                   |

## Типы (source/types.ts)

Все типы вынесены в единый файл:

| Категория | Типы                                          |
| --------- | --------------------------------------------- |
| Tool      | `Tool`, `ToolCall`                            |
| LLM       | `Message`, `ChatResponse`, `ProgressCallback` |
| Memory    | `Memory`, `MemoryMessage`                     |
| Config    | `ConfigKey`, `ConfigKeyType`, `Config`        |
| Telegram  | `ReactionEmoji`                               |

## Алиасы импортов

```typescript
import type { Tool, Message } from "#types";
import { getDeepSeekApiKey } from "#config";
import { chat } from "#deepseek";
import { startBot } from "#tgbot";
import { uptimeTool } from "#tools/uptime";
```

| Алиас              | Путь                              |
| ------------------ | --------------------------------- |
| `#types`           | `./source/types.ts`               |
| `#config`          | `./source/config/mod.ts`          |
| `#tgbot`           | `./source/channels/telegram/mod.ts` |
| `#deepseek`        | `./source/llms/deepseek.ts`       |
| `#tools/*`         | `./source/tools/*.ts`             |

## DeepSeek LLM (llms/deepseek.ts)

Использует **fetchify** для HTTP запросов и **valibot** для валидации ответов:

```typescript
const client = fetchify.create({
  baseURL: "https://api.deepseek.com",
  headers: { Authorization: `Bearer ${apiKey}` },
  limiter: { rps: 5 },
});

const response = await client.post("/chat/completions", { body });
const data = v.parse(ChatResponseSchema, await response.json());
```

### Agentic Loop

- До 10 шагов (tool calls)
- Прогресс отображается в Telegram
- Контекст сохраняется в памяти
- Автоматическая суммаризация при >15 сообщений

## Конфигурация

Приоритет: **ENV → KV → DEFAULTS**

| Переменная           | Описание                    | Default         |
| -------------------- | --------------------------- | --------------- |
| DEEPSEEK_API_KEY     | API ключ DeepSeek           | —               |
| DEEPSEEK_MODEL_NAME  | Модель DeepSeek             | `deepseek-chat` |
| TELEGRAM_BOT_API_KEY | Токен Telegram бота         | —               |
| TELEGRAM_CODE        | Код авторизации владельца   | —               |
| TELEGRAM_USER_ID     | ID владельца                | —               |
| MOLTBOOK_API_KEY     | API ключ Moltbook           | —               |

## Telegram команды

| Команда        | Описание                        |
| -------------- | ------------------------------- |
| `/start`       | Приветствие                     |
| `/ping`        | Проверка работы                 |
| `/code <code>` | Авторизация владельца           |
| `/config`      | Показать конфиг (владелец)      |
| `/clear`       | Очистить память (владелец)      |
| `/context`     | Показать контекст (владелец)    |

## Запуск

```bash
cp .env.example .env  # Заполнить переменные
deno task dev         # Запуск с hot-reload
deno task test        # Тесты
deno task check       # Type-check
```

## Tools (12 инструментов)

| Tool              | Описание                           |
| ----------------- | ---------------------------------- |
| `get_uptime`      | Время работы системы               |
| `get_system_info` | Информация о системе (OS, CPU, RAM)|
| `get_processes`   | Топ процессов по CPU/RAM           |
| `ask_claude`      | Вызов Claude CLI                   |
| `web_search`      | Поиск в интернете                  |
| `moltbook`        | Moltbook API                       |
| `search_history`  | Поиск по логам разговоров          |
| `eval_js`         | Выполнение JavaScript кода         |
| `glock17`         | Glock17 API                        |
| `wttr`            | Погода (wttr.in)                   |
| `rate_sx`         | Курсы криптовалют (rate.sx)        |
| `cheat_sh`        | Шпаргалки (cheat.sh)               |

## Память агента

- **Deno KV** для хранения контекста
- До 20 последних сообщений
- Автоматическая суммаризация при переполнении
- Отдельная память для каждого chatId
