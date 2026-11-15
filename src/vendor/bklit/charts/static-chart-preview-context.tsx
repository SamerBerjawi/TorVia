// @ts-nocheck
// Vendored from bklit-ui@76299da (MIT). Do not edit; re-run scripts/vendor-bklit.mjs.
"use client";

import { createContext, type ReactNode, useContext } from "react";

const StaticChartPreviewContext = createContext(false);

/** Disables cartesian reveal clip-path for static docs previews. */
export function StaticChartPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <StaticChartPreviewContext.Provider value={true}>
      {children}
    </StaticChartPreviewContext.Provider>
  );
}

export function useStaticChartPreview() {
  return useContext(StaticChartPreviewContext);
}
