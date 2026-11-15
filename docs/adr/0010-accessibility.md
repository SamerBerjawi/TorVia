# 0010 — Accessibility: automated gates plus a manual checklist

**Context.** Target is WCAG 2.2 AA. Automated tools catch only part of it.

**Decision.** (1) `ui/contrast.test.ts` checks every token pairing in every skin/mode. (2) `e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1/2.2 A+AA rules) over every screen, dialog and menu in all six themes against a real qBittorrent. (3) `docs/accessibility.md` lists what must be checked by hand (screen reader, keyboard-only, zoom, reduced motion). Fixes land with the test that would have caught them.

**Consequences.** Colour and structural regressions fail CI. The manual checklist is not automated and must be re-run before releases.
