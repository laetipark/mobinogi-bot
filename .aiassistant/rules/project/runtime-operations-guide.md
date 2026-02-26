---
apply: always
---

# Runtime Operations Guide

## Local Run
- Default entry: `node mobinogi-bot.js`
- If package changes are needed: `npm install`

## Safety Rules
- Do not delete or reset runtime log/config files unless explicitly requested.
- Keep startup assumptions explicit (input files, expected JSON shape).
- Preserve existing fallback behavior when data files are missing or malformed.

## Logging Rules
- Keep logs actionable (timestamp, command context, error reason).
- Avoid logging private user content unless necessary for debugging.
- Redact tokens/keys if present in runtime objects.

## Change Validation
- After edits, run a basic syntax check by starting the bot module.
- Verify at least one existing command path and one failure path.
- If runtime validation cannot be completed, report it clearly.
