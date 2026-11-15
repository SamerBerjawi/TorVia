# 0013 — Opt-in completion notifications

**Context.** Users want to know when a download finishes. The Notification API needs HTTPS or localhost and a user-granted permission.

**Decision.** Off by default. Settings offers in-page messages or system notifications; choosing system notifications requests permission from the click and falls back to in-page messages if unavailable or denied. Completion is detected by diffing syncs (`domain/completions.ts`); a torrent first seen already complete is never announced. Notifications carry a `tag` so several open tabs collapse into one.

**Consequences.** No push when the page is closed (that needs a server). Detection is client-side only.
