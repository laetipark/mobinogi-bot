---
apply: always
---

# Text Encoding Policy

## Objective
- Prevent broken Korean text and mojibake in bot code/docs.
- Keep literals readable and maintainable.

## Encoding Rules
- Save edited files as UTF-8.
- Do not convert tracked files to CP949/EUC-KR/ANSI.
- Preserve original line endings unless explicitly requested.

## Edit Safety Rules
- Avoid full-file overwrite commands (`Set-Content`, `Out-File`) on existing tracked files.
- Use minimal patch edits for existing files.
- Never copy terminal-garbled text back into source.

## Prompt Editing Workflow (Required)
- Before prompt-driven coding in PowerShell sessions, force UTF-8 I/O:
  - `chcp 65001`
  - `[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)`
  - `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
  - `$OutputEncoding = [Console]::OutputEncoding`
- For existing tracked files, use patch-based edits only (`apply_patch` preferred).
- Use `Set-Content -Encoding utf8` only for new files or explicit recovery of invalid UTF-8 files.
- After any forced rewrite, run encoding checks immediately.

## Literal Rules
- Default to ASCII for identifiers/comments whenever possible.
- Do not use Unicode escapes (`\uXXXX`) for user-facing strings in JavaScript unless required.
- Prefer direct UTF-8 literals for readable strings.
- Allowed exception: regex/control/protocol escape sequences that must stay escaped.

## Validation Checklist
- Search for Unicode escapes: `rg -n "\\\\u[0-9a-fA-F]{4}" .`
- Search for broken text markers: `rg -n "占\\?" .`
- Verify modified file is UTF-8 readable: `Get-Content -Path <file> -Encoding utf8`
