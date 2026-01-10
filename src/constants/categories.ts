export const CATEGORIES = [
  "Carne",
  "Bebidas",
  "Salsas",
  "Desechables",
  "Hielos",
  "Carbón",
  "Extras",
] as const;

export type Category = (typeof CATEGORIES)[number];
