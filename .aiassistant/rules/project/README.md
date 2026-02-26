---
apply: always
---

# Project Rules Index

Shared rules for assistants working on `MessengerBot`.

## Scope
- This folder is commit-safe and should not contain real secrets.
- Keep hostnames, chat room names/IDs, tokens, and private user data out of tracked files.
- Runtime-specific values belong in local/private overlays, not project rules.

## Module Context
- `MessengerBot` is a messenger bot script module (Kakao bot runtime style), not a typical Node web server.
- The main runtime entry is `mobinogi-bot.js` and it depends on runtime globals (for example `BotManager`).
- Prioritize stability of command names, alarm timing behavior, and chat output formatting.

## Read Order
1. `architecture-overview.md`
2. `bot-development-guide.md`
3. `runtime-operations-guide.md`

## Working Rules
- Preserve existing command triggers unless a change is explicitly requested.
- Treat alarm time calculations (KST / repeat intervals / quiet hours) as behavior-sensitive.
- Avoid introducing Node-only runtime assumptions without checking messenger bot compatibility.
- Log or message format changes should be documented before rollout when user-facing.

## Maintenance Rules
- Keep conventions stable for existing bot commands.
- Document behavior changes before changing command output.
- Move local/private setup details to `../local`.
