export type RecUnit = "kg" | "pz" | "l";

export type Recommendation = {
  key: string;
  label: string;
  unit: RecUnit;
  target: number; // cantidad recomendada
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * MVP: equivalentes de consumo
 * - Adulto: 1.0
 * - Menor: 0.6
 */
export function buildRecommendations(
  adults: number,
  minors: number
): Recommendation[] {
  const a = Math.max(0, Number.isFinite(adults) ? adults : 0);
  const m = Math.max(0, Number.isFinite(minors) ? minors : 0);

  const eq = a + m * 0.6; // personas equivalentes

  // Tabla base (MVP). Ajustable después.
  const table: Array<Omit<Recommendation, "target"> & { perEq: number }> = [
    { key: "carne", label: "Carne", unit: "kg", perEq: 0.35 },
    { key: "tortillas", label: "Tortillas", unit: "pz", perEq: 4 },
    { key: "salsa", label: "Salsa", unit: "l", perEq: 0.06 },
    { key: "frijoles", label: "Frijoles", unit: "kg", perEq: 0.12 },
    { key: "carbon", label: "Carbón", unit: "kg", perEq: 0.18 },
    { key: "platos", label: "Platos", unit: "pz", perEq: 1.2 },
    { key: "vasos", label: "Vasos", unit: "pz", perEq: 2 },
    { key: "hielo", label: "Hielo", unit: "kg", perEq: 0.25 },
  ];

  return table.map((x) => ({
    key: x.key,
    label: x.label,
    unit: x.unit,
    target: round2(eq * x.perEq),
  }));
}

export function formatRecAmount(n: number, unit: RecUnit) {
  // pz mejor sin decimales (por ahora)
  if (unit === "pz") return `${Math.round(n)}`;
  return n.toFixed(2);
}
