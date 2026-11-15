# 0006 — Hugeicons for UI, Material Icon Theme for files

**Context.** Hugeicons Free (stroke, rounded) covers UI glyphs but not ~30 file types.

**Decision.** All UI glyphs come from one registry (`app/icons.ts`). File-type icons use Material Icon Theme (MIT), generated at build time into `fileIcons.generated.ts` from a kind map; `domain/fileKind.ts` classifies names.

**Consequences.** One place to swap icon sets; file icons need no network and no runtime icon lookup.
