---
apply: always
---

# Bot Development Guide

## Code Style
- Follow existing JavaScript/CommonJS style in `mobinogi-bot.js`.
- Keep function names intention-revealing and command-focused.
- Avoid large in-place rewrites; make incremental changes.

## Command Handling
- Keep command aliases and trigger strings backward compatible.
- Keep parsing defensive against malformed user input.
- When adding a command, isolate parse, execute, and format steps.

## Data and State
- Treat `bot.json` as runtime configuration source.
- Treat `log.json` as runtime log/output data.
- Validate JSON read/write paths and guard against file corruption.

## Error Handling
- Catch runtime failures around external calls and file operations.
- Return user-safe messages for expected failures.
- Keep detailed error context in logs, not in user-facing text.

## Dependency Policy
- Avoid new dependencies unless existing code cannot solve the problem.
- If dependency is required, document why in PR/commit notes.
