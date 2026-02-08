# AgentSmith

Telegram-бот с LLM-агентом, tool calling и памятью. Deno + multi-provider LLM.

## Требования

- [Deno](https://deno.land/) v2+
- Telegram Bot Token (через @BotFather)
- API ключ одного из LLM провайдеров или ChatGPT Plus/Pro подписка

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
| `LLM_PROVIDER` | LLM провайдер (см. ниже) | `deepseek` |
| `DEEPSEEK_API_KEY` | API ключ DeepSeek | - |
| `DEEPSEEK_MODEL_NAME` | Модель DeepSeek | `deepseek-chat` |
| `OPENAI_API_KEY` | API ключ OpenAI | - |
| `OPENAI_MODEL_NAME` | Модель OpenAI | `gpt-4o` |
| `ANTHROPIC_API_KEY` | API ключ Anthropic | - |
| `ANTHROPIC_MODEL_NAME` | Модель Anthropic | `claude-sonnet-4-20250514` |
| `LMSTUDIO_BASE_URL` | URL LMStudio API | `http://100.107.243.60:1234/v1` |
| `LMSTUDIO_MODEL_NAME` | Модель LMStudio | - |
| `OLLAMA_BASE_URL` | URL Ollama API | `http://localhost:11434/v1` |
| `OLLAMA_MODEL_NAME` | Модель Ollama | - |
| `TELEGRAM_BOT_API_KEY` | Токен Telegram бота | - |
| `TELEGRAM_USER_ID` | ID владельца бота | - |
| `TELEGRAM_CODE` | Код авторизации | - |
| `MOLTBOOK_API_KEY` | API ключ Moltbook | - |

### LLM провайдеры

| Провайдер | API | Аутентификация |
|---|---|---|
| `deepseek` | Chat Completions | API key |
| `openai` | Chat Completions | API key |
| `openai-oauth` | Responses API (SSE) | ChatGPT Plus/Pro OAuth |
| `anthropic` | Chat Completions | API key |
| `ollama` | Chat Completions | - |
| `lmstudio` | Chat Completions | - |

Провайдер `openai-oauth` использует OAuth PKCE через `auth.openai.com` и работает через `chatgpt.com/backend-api/codex`. Для настройки: `smith setup llm` → выбрать `openai-oauth`.

## Привязка владельца

Бот отвечает только своему владельцу. Привязка происходит через код авторизации:

1. Задать `TELEGRAM_CODE` в `.env` (любая строка-пароль)
2. Запустить бота
3. Написать боту в Telegram: `/code <ваш_код>`
4. Бот ответит "You are now registered as the owner" и запомнит ваш Telegram ID

После этого `TELEGRAM_USER_ID` сохраняется в Deno KV — повторная привязка не нужна (даже после перезапуска). Все остальные пользователи получат "Access denied".

## Telegram-команды

| Команда | Описание |
|---|---|
| `/start` | Приветствие |
| `/ping` | Проверка связи |
| `/code <код>` | Привязка владельца по коду из `TELEGRAM_CODE` |
| `/config` | Текущая конфигурация (замаскированные ключи) |
| `/clear` | Очистить память бота для текущего чата |
| `/context` | Показать текущий контекст (саммари + последние сообщения) |
| `/contacts` | Список известных контактов |
| `/groups` | Список известных групп |

Команды `/config`, `/clear`, `/context`, `/contacts`, `/groups` доступны только владельцу.

## Команды разработки

```bash
deno task dev     # запуск с hot-reload
deno task check   # проверка типов
deno task fmt     # форматирование
deno task lint    # линтер
deno task test    # тесты
```

## Docker

```bash
cp .env.example .env
# заполнить .env

docker compose up -d          # запуск
docker compose logs -f        # логи
docker compose down            # остановка
docker compose up -d --build   # пересборка после изменений
```

Данные (Deno KV, дампы) хранятся в volume `smith-data` и переживают пересоздание контейнера.

## Как работает агент

### Сборка контекста

При получении сообщения от пользователя `buildContext()` собирает всё в единый `AgentContext`:

```
1. System prompt
   ├── Профиль (smith / default) — выбирается из конфига
   └── Инструкции скиллов — если в тексте сообщения найдены триггеры
2. Память (если есть chatId)
   ├── Саммари предыдущих разговоров (если накопилось)
   └── Последние 20 сообщений из истории
3. Сообщение пользователя
4. Список tools — 17 инструментов, каждый описан как JSON Schema
```

Результат — массив `messages` + массив `toolsPayload` для отправки в LLM.

### Агентный цикл (loop)

`chat()` запускает цикл до `MAX_STEPS=10` итераций:

```
resolveProvider() → выбор провайдера из конфига
buildContext()    → сборка messages + tools
                    │
                    ▼
        ┌──► complete(messages, tools, provider)
        │         │
        │         ├── finish_reason: "stop"
        │         │     └── возврат текстового ответа, сохранение в память
        │         │
        │         └── finish_reason: "tool_calls"
        │               ├── выполнить каждый tool call
        │               ├── добавить результаты в messages
        │               └──►┘ следующий step
        │
        └── (повтор до MAX_STEPS или "stop")
```

На каждом шаге агент может вызвать один или несколько инструментов. Результаты выполнения добавляются обратно в `messages` и отправляются в LLM на следующей итерации, пока модель не вернёт финальный текстовый ответ.

### Одобрение опасных тулов

Перед выполнением потенциально опасных инструментов (`run_shell_command`, `eval_code`) бот запрашивает подтверждение у владельца через inline-кнопки (✅ Yes / ❌ No). Сообщение прогресса редактируется, показывая название тула и аргументы. Если владелец не ответил в течение 2 минут — автоматический отказ.

### Запрос к LLM API

Большинство провайдеров используют OpenAI-совместимый эндпоинт `POST /chat/completions`. Провайдер `openai-oauth` использует Responses API (`POST /responses`) через SSE-стриминг.

Тело запроса:

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "system", "content": "профиль + скиллы" },
    { "role": "assistant", "content": "Previous conversation summary: ..." },
    { "role": "user", "content": "предыдущее сообщение" },
    { "role": "assistant", "content": "предыдущий ответ" },
    { "role": "user", "content": "текущее сообщение" }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "web_search",
        "description": "...",
        "parameters": { "type": "object", "properties": { ... } }
      }
    }
  ],
  "tool_choice": "auto"
}
```

Если модель решает вызвать инструмент, ответ содержит `tool_calls`. Агент выполняет их и добавляет результат:

```json
{ "role": "tool", "tool_call_id": "call_abc", "content": "{...}" }
```

После чего весь массив messages отправляется повторно — модель видит результат и либо вызывает ещё инструменты, либо отвечает текстом.

Ответ валидируется через Valibot-схему, токены суммируются по всем шагам.

## Структура

```
source/
  main.ts              # точка входа
  types.ts             # все типы и интерфейсы
  config.ts            # конфигурация (ENV + KV)
  common.ts            # shibui core + Deno KV singleton
  cli/
    mod.ts             # CLI wiring (Cliffy commands)
    commands/
      run.ts           # запуск агента + бота (default action)
      config.ts        # показ конфигурации
      setup.ts         # интерактивный визард настройки
  agent/
    loop.ts            # агентный цикл с tool calling
    context.ts         # сборка контекста (system prompt + memory + tools)
    system-prompt.ts   # построение системного промпта
    memory.ts          # память с авто-суммаризацией
    dump.ts            # дампы в ~/.smith/dumps/
    profiles/          # профили агента (smith, default)
    skills/            # навыки (детектятся по триггерам)
    tools/             # инструменты агента
    llms/              # LLM провайдеры (deepseek, openai, openai-oauth, anthropic, ollama, lmstudio)
  telegram/
    mod.ts             # Grammy бот
    approval.ts        # одобрение опасных тулов (inline-кнопки)
    contacts.ts        # контакты и группы
    helpers.ts         # telegram API хелперы
```
