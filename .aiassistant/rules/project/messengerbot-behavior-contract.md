---
apply: always
---

# MessengerBot Behavior Contract

## Scope
- This file defines behavior-sensitive contracts for game feed and list commands.
- Follow these contracts unless the user explicitly requests a behavior change.

## Notice/Event List Commands
- `/공지 목록`
- `/이벤트 목록`

Rules:
- Keep backend response order as-is (no client-side reordering).
- Show at most 10 preview rows and append summary for remaining rows.
- Keep user-facing labels stable for the current format.

Notice list output contract:
- Include `제목`.
- Include `일자`.
- Include `링크` mapped by `noticeType`:
  - `updateNote` -> `https://mabinogimobile.nexon.com/News/Update/{noticeId}`
  - `erinNote` -> `https://mabinogimobile.nexon.com/News/Devnote/{noticeId}`
  - default -> `https://mabinogimobile.nexon.com/News/Notice/{noticeId}`
- Do not expose `ID`/`분류` rows in the user output.

Event list output contract:
- Include `제목`.
- Include `기간`.
- Include `링크`: `https://mabinogimobile.nexon.com/News/Events/{eventId}`
- Period format: `yyyy-mm-dd ~ yyyy-mm-dd HH:mm`.
- Do not expose `ID`/`마감임박`/`남은일수` rows in the user output.

## Game Feed Watcher (10-minute poll)
- Service file: `node_modules/game-feed-watch-service.js`

Rules:
- Sync immediately once at startup, then keep 10-minute boundary sync.
- On startup, do not send baseline status messages.
- Broadcast only when changes are detected.
- Change types allowed for alerts:
  - New notice/event
  - Title changed on existing notice/event id
- If multiple changes are detected, aggregate into one summary message.

## Snapshot Persistence
- Persist watcher snapshot and latest detection metadata.
- Primary path: `game-feed-watch-snapshot.json` (or configured path).
- Persist payload fields:
  - `noticeSnapshotById`
  - `eventSnapshotById`
  - `latestDetectionInfo`
- Prefer messenger runtime-compatible storage APIs (`FileStream` / Java I/O) first.

