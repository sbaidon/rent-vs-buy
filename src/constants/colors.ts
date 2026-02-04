// Colors for the flame graph sliders
// Using a cohesive copper/teal palette that blends well
export const COLORS = {
  // Rent: warm copper tones (lighter)
  RENT: "oklch(0.78 0.12 55)",
  // Buy: deeper copper/bronze (darker) 
  BUY: "oklch(0.58 0.14 45)",
} as const;

// Light mode variants
export const COLORS_LIGHT = {
  RENT: "oklch(0.85 0.10 55)",
  BUY: "oklch(0.65 0.12 45)",
} as const;
