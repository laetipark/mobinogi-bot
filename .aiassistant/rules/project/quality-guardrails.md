---
apply: always
---

# Quality Guardrails

## Objective
- Prevent encoding breakage in bot code and message templates.
- Prevent unnecessary Unicode escape usage in readable strings.
- Keep bot command execution responsive and predictable.
- Keep code documentation consistent and maintainable.

## Encoding Guardrails
- Save edited files as UTF-8.
- Do not re-save tracked files with CP949/EUC-KR/ANSI.
- Preserve line endings unless explicitly requested.
- Avoid full-file overwrite commands on tracked files.
- Do not copy garbled terminal text back into source.

## Unicode Literal Guardrails
- Do not add `\uXXXX` for readable command/help/alarm messages.
- Use readable UTF-8 literals for user-facing text.
- Allowed exception:
  - regex/control/protocol escapes that must remain escaped.

## Execution Guardrails (Bot Runtime)
- Keep chat command handlers non-blocking and short-running.
- Move heavy external API work to scheduled/background flow when possible.
- Bound retries/timeouts for network calls to avoid command stalls.
- Preserve existing command triggers and response schema unless explicitly changed.
- Keep alarm scheduler behavior deterministic (KST, interval, quiet-hour rules).

## Commenting Guardrails
- Add JSDoc to changed or newly added top-level variables/constants/functions.
- Include `@param`, `@returns`, `@type` tags where applicable.
- Keep one blank line between adjacent JSDoc blocks for readability.
- Add line/block comments inside functions for non-trivial branches, state changes, and API calls.
- Do not add redundant comments that only restate code literally.

## Validation Checklist
- Unicode escape scan: `rg -n "\\\\u[0-9a-fA-F]{4}" .`
- Garbled text scan: `rg -n "�" .`
- JSDoc tag scan: `rg -n "@param|@returns|@type" node_modules/mobinogi-*.js mobinogi-bot.js`
- Basic syntax/runtime check in bot runtime-compatible environment.
- Smoke-check major commands and one alarm cycle after behavior changes.
