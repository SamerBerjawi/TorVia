# 0011 — Internationalisation deferred

**Context.** qBittorrent’s own UI is translated; ours is English-only, with several hundred strings inline in components. Number, date and size formatting already follow the browser locale (`Intl`).

**Decision.** Not shipped yet. Shipping a catalogue half-wired would mix languages and rot. The plan: (1) extract all user-facing strings into a typed message catalogue with ICU-style plurals, (2) add a lint/test that fails on new inline literals, (3) ship `en` plus community locales, with RTL checked in the three skins.

**Consequences.** Until then, the UI is English. Avoid concatenating sentences from fragments in new code so extraction stays mechanical.
