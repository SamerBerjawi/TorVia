# 0007 — Base UI primitives under a strict CSP

**Context.** Dialogs, menus and toasts need correct focus handling and ARIA. Our CSP is `style-src 'self'` (no inline `<style>`).

**Decision.** Use Base UI (headless) for dialogs, alert dialogs, menus, context menus and toasts, wrapped in `CSPProvider disableStyleElements`. All styling is ours (`ui/app.css`).

**Consequences.** Accessible behaviour for free, strict CSP preserved. Some Base UI state attributes (`data-behind`, …) are styling hooks we depend on.
