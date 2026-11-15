# 0004 — Three skins on semantic tokens

**Context.** Three designs (Graphite, Paper, Signal), each light and dark, had to stay in sync functionally.

**Decision.** Colours, fonts and row heights exist only as semantic CSS variables in `ui/tokens.css`, selected by `<html data-skin data-mode>`. Layout differences live in one `*Layout.tsx` per skin; behaviour (filtering, selection, keyboard, actions) lives in shared components. `ui/contrast.test.ts` enforces WCAG AA for every token pairing.

**Consequences.** A new skin is a token block plus a layout. Components never hard-code colours.
