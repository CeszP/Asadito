export type SuggestedCut = { name: string; pct: number };

export const SUGGESTED_CUTS: Record<string, SuggestedCut[]> = {
  carne: [
    { name: "Diezmillo",  pct: 0.45 },
    { name: "Arrachera",  pct: 0.30 },
    { name: "Chorizo",    pct: 0.15 },
    { name: "Cecina",     pct: 0.10 },
  ],
  tortillas: [
    { name: "Tortillas de maíz",   pct: 0.70 },
    { name: "Tortillas de harina", pct: 0.30 },
  ],
  salsa: [
    { name: "Salsa verde", pct: 0.50 },
    { name: "Salsa roja",  pct: 0.50 },
  ],
  frijoles: [
    { name: "Frijoles de la olla",  pct: 0.60 },
    { name: "Frijoles refritos",    pct: 0.40 },
  ],
};
