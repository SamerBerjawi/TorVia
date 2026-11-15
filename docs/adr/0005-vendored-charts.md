# 0005 — Vendored Bklit charts, lazy-loaded

**Context.** We wanted Bklit’s chart components. They are shadcn-style source, not a package.

**Decision.** `scripts/vendor-bklit.mjs` copies the needed MIT-licensed components (never the proprietary studio package) into `src/vendor/bklit/` with a header and LICENSE; Tailwind v4 theme+utilities load without preflight and map chart variables onto skin tokens. Charts are `React.lazy` so the main bundle stays small.

**Consequences.** Upgrading is re-running the script. Vendored files are generated: do not hand-edit.
