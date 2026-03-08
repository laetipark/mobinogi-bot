---
apply: always
---

# MessengerBot AI Assistant Rules Entry

This assistant must use `.aiassistant/rules/project` as the shared rule source.

## Required Rules (Git-safe)
Read in this order:
1. `project/README.md`
2. `project/architecture-overview.md`
3. `project/text-encoding-policy.md`
4. `project/quality-guardrails.md`
5. `project/messengerbot-behavior-contract.md`
6. `project/bot-development-guide.md`
7. `project/runtime-operations-guide.md`

## Optional Local Rules (Git-safe template)
Load only when needed for local environment or deployment details:
- `local/bot-patterns.md`
- `local/environment-configuration.md`
- `local/deployment-secrets.md`

## Execution Policy
- Keep command behavior and response format backward compatible.
- Prefer focused edits in `mobinogi-bot.js`; avoid broad rewrites.
- Keep logs useful for troubleshooting without exposing private data.
- Do not add dependencies unless there is a clear need.
