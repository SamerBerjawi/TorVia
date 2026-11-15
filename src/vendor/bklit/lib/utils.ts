// @ts-nocheck
// Vendored from bklit-ui@76299da (MIT). Do not edit; re-run scripts/vendor-bklit.mjs.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
