# Accessibility

Target: WCAG 2.2 level AA.

## Automated (runs in CI)
- `src/ui/contrast.test.ts` — every text token against every surface it can sit on, in all six skin × mode themes.
- `e2e/a11y.spec.ts` — axe-core over: torrent list, add dialog, each details tab, table options, command palette, context menu, global speed limits, statistics, settings; in all six themes, against real qBittorrent. Set `A11Y_REPORT=/path/report.tsv` to collect every finding instead of reading failures one at a time.

## Manual checklist (before each release)
Automated rules cover roughly a third of WCAG. Check by hand:
- [ ] Keyboard only: reach and operate every control; no traps; visible focus everywhere; Esc closes overlays and returns focus to the trigger.
- [ ] Screen reader (NVDA or VoiceOver): grid announces rows, selection and sort; toasts are announced; dialogs are labelled; icon buttons have names.
- [ ] 200% zoom and 320 px width: no loss of content or horizontal scrolling of the page (the torrent table may scroll inside itself).
- [ ] Reduced motion honoured (`prefers-reduced-motion`).
- [ ] Forced-colors / high-contrast mode: focus and selection remain visible.
- [ ] Touch targets ≥ 24×24 CSS px (WCAG 2.5.8); primary controls on phones are ≥ 44 px.
- [ ] Colour is never the only carrier of meaning (status has text and icon).

## Known gaps
- Status colours rely on text labels, which are present; the progress bar itself has `role="meter"` with a value.
- Charts expose a text summary in surrounding KPIs, not a data table. A table alternative is planned.
