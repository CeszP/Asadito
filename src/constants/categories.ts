export const CATEGORIES = [
  "Carne",
  "Tortillas",
  "Salsas",
  "Frijoles",
  "Carbón",
  "Hielos",
  "Desechables",
  "Bebidas",
  "Extras",
] as const;

export type Category = (typeof CATEGORIES)[number];
