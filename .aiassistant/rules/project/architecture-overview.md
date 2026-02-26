---
apply: always
---

# Architecture Overview

## Stack
- Runtime: Node.js (CommonJS)
- Entry point: `mobinogi-bot.js`
- Config/data files: `bot.json`, `log.json`

## Repository Shape
- Single-script bot module with supporting JSON files.
- No build step or framework layer in this module.

## Core Runtime Model
1. Incoming message is parsed.
2. Command/keyword matching routes to handler logic.
3. Bot formats response and sends message.
4. Runtime data and logs are persisted in JSON files when needed.

## Design Principles
- Keep command routing explicit and easy to trace.
- Prefer small helper functions over large nested branches.
- Preserve existing response tone/format unless change is requested.
- Keep operational logging concise and useful.
