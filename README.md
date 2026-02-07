# AgentSmith

Telegram-бот с LLM-агентом, tool calling и памятью. Deno + DeepSeek/LMStudio.

## Требования

- [Deno](https://deno.land/) v2+
- Telegram Bot Token (через @BotFather)
- API ключ DeepSeek или запущенный LMStudio

## Быстрый старт

```bash
cp .env.example .env
# заполнить .env

deno task dev
```

## Конфигурация

Приоритет: ENV -> Deno KV -> значения по умолчанию.

| Переменная | Описание | По умолчанию |
|---|---|---|
| `AGENT_PROFILE` | Профиль агента (`smith`, `default`) | `smith` |
| `LLM_PROVIDER` | LLM провайдер (`deepseek`, `lmstudio`) | `deepseek` |
| `DEEPSEEK_API_KEY` | API ключ DeepSeek | - |
| `DEEPSEEK_MODEL_NAME` | Модель DeepSeek | `deepseek-chat` |
| `LMSTUDIO_BASE_URL` | URL LMStudio API | `http://100.107.243.60:1234/v1` |
| `LMSTUDIO_MODEL_NAME` | Модель LMStudio | - |
| `TELEGRAM_BOT_API_KEY` | Токен Telegram бота | - |
| `TELEGRAM_USER_ID` | ID владельца бота | - |
| `TELEGRAM_CODE` | Код авторизации | - |
| `MOLTBOOK_API_KEY` | API ключ Moltbook | - |

## Команды

```bash
deno task dev     # запуск с hot-reload
deno task check   # проверка типов
deno task fmt     # форматирование
deno task lint    # линтер
deno task test    # тесты
```

## Структура

```
source/
  main.ts              # точка входа
  types.ts             # все типы и интерфейсы
  config.ts            # конфигурация (ENV + KV)
  common.ts            # shibui core + Deno KV singleton
  agent/
    loop.ts            # агентный цикл с tool calling
    context.ts         # сборка контекста (system prompt + memory + tools)
    system-prompt.ts   # построение системного промпта
    memory.ts          # память с авто-суммаризацией
    dump.ts            # дампы в ~/.smith/dumps/
    profiles/          # профили агента (smith, default)
    skills/            # навыки (детектятся по триггерам)
    tools/             # инструменты агента
    llms/              # LLM провайдеры (deepseek, lmstudio)
  telegram/
    mod.ts             # Grammy бот
    contacts.ts        # контакты и группы
    helpers.ts         # telegram API хелперы
```
