// @ts-nocheck
// Vendored from bklit-ui@76299da (MIT). Do not edit; re-run scripts/vendor-bklit.mjs.
/**
 * Ported from @visx/pattern 4.0.0 (https://github.com/airbnb/visx).
 * MIT License — Copyright (c) 2017-2018 Harrison Shoff. See ./LICENSE-visx-pattern.
 */

export const PatternOrientation = {
  horizontal: "horizontal",
  vertical: "vertical",
  diagonal: "diagonal",
  diagonalRightToLeft: "diagonalRightToLeft",
} as const;

export type PatternOrientationType =
  (typeof PatternOrientation)[keyof typeof PatternOrientation];
