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

## Literal Rules
- Default to ASCII for identifiers/comments whenever possible.
- Do not use Unicode escapes (`\uXXXX`) for user-facing strings in JavaScript unless required.
- Prefer direct UTF-8 literals for readable strings.
- Allowed exception: regex/control/protocol escape sequences that must stay escaped.

## Validation Checklist
- Search for Unicode escapes: `rg -n "\\\\u[0-9a-fA-F]{4}" .`
- Search for replacement character: `rg -n "�" .`
