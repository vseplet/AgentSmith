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
resolveProvider() → выбор провайдера (deepseek/lmstudio) из конфига
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

### Запрос к LLM API

Все провайдеры используют OpenAI-совместимый эндпоинт `POST /chat/completions`.

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
