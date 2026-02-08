<p align="center">
  <img src="banner.png" alt="AgentSmith" width="700">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Deno-2+-blue?logo=deno" alt="Deno">
  <a href="https://github.com/vseplet/AgentSmith"><img src="https://img.shields.io/github/stars/vseplet/AgentSmith?style=flat" alt="Stars"></a>
  <a href="https://t.me/agentsmithdev"><img src="https://img.shields.io/badge/Telegram-Chat-26A5E4?logo=telegram&logoColor=white" alt="Telegram Chat"></a>
  <a href="https://github.com/vseplet/AgentSmith/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License"></a>
</p>

# AgentSmith

A hackable AI agent framework for Telegram. ~4K lines of TypeScript, 6 LLM providers, 16 tools, full agent loop with memory -- and every piece of code is small enough to read and modify in minutes. Clone it, make it yours.

```
You:   check disk space and tell me if anything is above 80%
Smith: /dev/sda1 is at 87%, the rest is fine
       Maybe stop hoarding cat pictures, Mr Anderson

You:   what's the weather in tokyo tomorrow?
Smith: Tokyo: 12C, cloudy, rain in the evening
       Even the weather weeps for humanity

You:   take a screenshot
Smith: [approval required: take_screenshot] ✅ Yes / ❌ No
       *sends screenshot of your desktop*
```

## Why AgentSmith

This is not a black-box SaaS. It's a starting point -- a minimal, readable codebase that you fork and bend to your needs. Want to add a tool? One file, one export. New LLM provider? Implement two functions. Custom personality? Edit a string.

- **~4K lines total** -- no abstractions for the sake of abstractions. Every file does one thing, every file is short enough to fully understand
- **Designed to be extended** -- adding a tool is ~30 lines, a new LLM provider is ~40 lines, a skill is a trigger + a prompt. The architecture stays out of your way
- **Any LLM** -- DeepSeek, OpenAI, Claude, Ollama, LMStudio, or ChatGPT Plus via OAuth. Switch with one command, or add your own provider
- **Runs anywhere** -- VPS, Raspberry Pi, NAS, Docker. If it runs Deno, it runs Smith
- **Safe by design** -- dangerous tools (shell, eval, screenshot) require explicit approval via inline buttons. 2-min timeout = auto-deny
- **Memory** -- remembers conversations, auto-summarizes old context
- **Owner-only** -- one-time code auth, then only you can talk to your bot

## Getting Started

### 1. Create a Telegram bot

Open [@BotFather](https://t.me/BotFather) in Telegram, create a bot, save the token.

### 2. Get an LLM API key

Pick any provider: [DeepSeek](https://platform.deepseek.com/), [OpenAI](https://platform.openai.com/), [Anthropic](https://console.anthropic.com/), or use a local model via [Ollama](https://ollama.ai/) / [LMStudio](https://lmstudio.ai/).

### 3. Install and run

```bash
# Clone
git clone https://github.com/vseplet/AgentSmith.git
cd AgentSmith

# Interactive setup -- guides you through everything
deno task cli setup

# Or configure manually
cp .env.example .env
# edit .env with your keys

# Run
deno task dev
```

### 4. Claim your bot

Send `/code <your_code>` to your bot in Telegram (the code you set during setup). Done -- you're the owner.

### Docker

```bash
cp .env.example .env
# edit .env

docker compose up -d
```

Data persists in the `smith-data` volume across container restarts.

## LLM Providers

| Provider | API | Auth |
|---|---|---|
| `deepseek` | Chat Completions | API key |
| `openai` | Chat Completions | API key |
| `openai-oauth` | Responses API (SSE) | ChatGPT Plus/Pro OAuth |
| `anthropic` | Chat Completions | API key |
| `ollama` | Chat Completions | -- |
| `lmstudio` | Chat Completions | -- |

Switch anytime: `smith setup llm`

## Tools

The agent can autonomously decide which tools to use based on your request:

| Tool | What it does |
|---|---|
| `run_shell_command` | Execute any shell command |
| `eval_code` | Run JavaScript/TypeScript code |
| `web_search` | Search the web |
| `get_system_info` | OS, CPU, memory, disk |
| `get_uptime` | System uptime |
| `list_processes` | Running processes |
| `ask_claude` | Query Claude as a sub-agent |
| `search_history` | Search conversation logs |
| `wttr` | Weather forecast |
| `rate_sx` | Crypto exchange rates |
| `cheat_sh` | Programming cheat sheets |
| `ifconfig` | Public IP info |
| `take_screenshot` | Capture screen and send as photo |
| `telegram_send` | Send messages to Telegram users/groups |
| `telegram_contacts` | List known contacts |
| `telegram_groups` | List known groups |

Tools marked as `dangerous` require your approval via inline buttons before execution.

## Bot Commands

| Command | Description |
|---|---|
| `/code <code>` | Claim ownership |
| `/config` | View configuration (masked secrets) |
| `/clear` | Clear conversation memory |
| `/context` | Show current context (summary + recent messages) |
| `/contacts` | List known contacts |
| `/groups` | List known groups |

## Extend It

**Add a tool** -- one file, one export, register in `tools/mod.ts`:

```ts
// source/agent/tools/my-tool.ts
export const myTool: Tool = {
  name: "my_tool",
  description: "Does something useful",
  dangerous: true, // requires owner approval before execution
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Input" },
    },
    required: ["query"],
  },
  execute: async (args) => {
    // your logic here
    return { result: "done" };
  },
};
```

**Add an LLM provider** -- implement `getProviderConfig()` + `setupFields`, register in `llms/mod.ts`. That's it.

**Change personality** -- edit the profile string in `source/agent/profiles/`.

---

## Development

### Requirements

- [Deno](https://deno.land/) v2+
- Telegram Bot Token
- API key for at least one LLM provider

### Commands

```bash
deno task dev     # run with hot-reload
deno task check   # type checking
deno task fmt     # format
deno task lint    # lint
deno task test    # tests
```

### Configuration

Priority: ENV > Deno KV > defaults.

| Variable | Description | Default |
|---|---|---|
| `AGENT_PROFILE` | Agent profile (`smith`, `default`) | `smith` |
| `LLM_PROVIDER` | LLM provider | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | -- |
| `DEEPSEEK_MODEL_NAME` | DeepSeek model | `deepseek-chat` |
| `OPENAI_API_KEY` | OpenAI API key | -- |
| `OPENAI_MODEL_NAME` | OpenAI model | `gpt-4o` |
| `ANTHROPIC_API_KEY` | Anthropic API key | -- |
| `ANTHROPIC_MODEL_NAME` | Anthropic model | `claude-sonnet-4-20250514` |
| `LMSTUDIO_BASE_URL` | LMStudio API URL | `http://localhost:1234/v1` |
| `LMSTUDIO_MODEL_NAME` | LMStudio model | -- |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434/v1` |
| `OLLAMA_MODEL_NAME` | Ollama model | -- |
| `TELEGRAM_BOT_API_KEY` | Telegram bot token | -- |
| `TELEGRAM_USER_ID` | Owner's Telegram ID | -- |
| `TELEGRAM_CODE` | Authorization code | -- |
| `MOLTBOOK_API_KEY` | Moltbook API key | -- |

### Architecture

#### Context Assembly

On each message, `buildContext()` assembles the full agent context:

```
1. System prompt
   +-- Profile (smith / default)
   +-- Skill instructions (if triggers matched)
2. Memory (if chatId exists)
   +-- Conversation summary
   +-- Last 20 messages
3. User message
4. Tools -- 15 instruments as JSON Schema
```

#### Agent Loop

`chat()` runs up to `MAX_STEPS=10` iterations:

```
resolveProvider() -> pick LLM from config
buildContext()    -> assemble messages + tools
                    |
                    v
        +---> complete(messages, tools, provider)
        |         |
        |         +-- finish_reason: "stop"
        |         |     +-- return text, save to memory
        |         |
        |         +-- finish_reason: "tool_calls"
        |               +-- approve dangerous tools (if needed)
        |               +-- execute each tool call
        |               +-- add results to messages
        |               +-->+ next step
        |
        +-- (repeat until MAX_STEPS or "stop")
```

#### Tool Approval

Before executing `run_shell_command` or `eval_code`, the bot edits the progress message to show the tool name and arguments with inline buttons. Owner has 2 minutes to approve or deny. No response = auto-deny.

### Project Structure

```
source/
  main.ts                # entry point
  core/
    types.ts             # types and interfaces
    config.ts            # configuration (ENV + KV)
    common.ts            # shibui core + Deno KV singleton
    loop.ts              # agent loop with tool calling
    context.ts           # context assembly (system prompt + memory + tools)
    system-prompt.ts     # system prompt builder
    memory.ts            # memory with auto-summarization
    dump.ts              # dumps to ~/.smith/dumps/
    llms/                # LLM providers (deepseek, openai, openai-oauth, anthropic, ollama, lmstudio)
    telegram/
      mod.ts             # Grammy bot
      approval.ts        # dangerous tool approval (inline buttons)
      contacts.ts        # contacts and groups
      helpers.ts         # telegram API helpers
    cli/
      mod.ts             # CLI wiring (Cliffy commands)
      commands/
        run.ts           # start agent + bot (default action)
        config.ts        # show configuration
        setup.ts         # interactive setup wizard
  tools/                 # agent tools (~30 lines each)
  profiles/              # agent profiles (smith, default)
  skills/                # skills (detected by triggers)
```
