// @ts-nocheck
// Vendored from bklit-ui@76299da (MIT). Do not edit; re-run scripts/vendor-bklit.mjs.
"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

interface ChartLegendHoverContextValue {
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}

const ChartLegendHoverContext =
  createContext<ChartLegendHoverContextValue | null>(null);

export function ChartLegendHoverProvider({
  hoveredIndex,
  onHoverChange,
  children,
}: {
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ hoveredIndex, setHoveredIndex: onHoverChange }),
    [hoveredIndex, onHoverChange]
  );

  return (
    <ChartLegendHoverContext.Provider value={value}>
      {children}
    </ChartLegendHoverContext.Provider>
  );
}

export function useChartLegendHover(): ChartLegendHoverContextValue {
  const context = useContext(ChartLegendHoverContext);
  return (
    context ?? {
      hoveredIndex: null,
      setHoveredIndex: () => {
        /* noop outside ChartLegendHoverProvider */
      },
    }
  );
}
