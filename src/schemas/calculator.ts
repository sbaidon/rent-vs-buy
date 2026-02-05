import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import pkg from "lz-string";
import { CalculatorValues } from "../context/calculator-context";
import { initialValues } from "../constants/calculator";

/**
 * Schema for calculator search params with a single compressed `q` parameter.
 * 
 * Example URL: /?q=N4IgDg...
 * 
 * Benefits:
 * - Short, shareable URLs
 * - All state in one param
 * - Simple validation
 */

/**
 * Encodes calculator values to a compressed URL-safe string
 */
export function encodeState(values: CalculatorValues): string {
  return pkg.compressToEncodedURIComponent(JSON.stringify(values));
}

/**
 * Decodes a compressed string back to calculator values
 * Falls back to defaults for invalid/missing data
 */
export function decodeState(encoded: string): CalculatorValues {
  try {
    const decompressed = pkg.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return initialValues;

    const decoded = JSON.parse(decompressed);
    if (!decoded || typeof decoded !== "object") return initialValues;

    // Merge with defaults, only keeping valid keys with matching types
    return {
      ...initialValues,
      ...Object.fromEntries(
        Object.entries(decoded).filter(
          ([k, v]) => k in initialValues && typeof v === typeof initialValues[k as keyof CalculatorValues]
        )
      ),
    } as CalculatorValues;
  } catch {
    return initialValues;
  }
}

/**
 * Simple schema: single optional `q` param
 * The q param contains compressed JSON state
 */
export const calculatorSearchSchema = z.object({
  q: fallback(z.string(), "").optional().default(""),
});

export type CalculatorSearchParams = z.input<typeof calculatorSearchSchema>;
export type CalculatorSearchOutput = z.output<typeof calculatorSearchSchema>;

/**
 * Converts URL search params to CalculatorValues
 */
export function searchParamsToValues(params: CalculatorSearchOutput): CalculatorValues {
  if (!params.q) return initialValues;
  return decodeState(params.q);
}

/**
 * Converts CalculatorValues to URL search params
 */
export function valuesToSearchParams(values: CalculatorValues): CalculatorSearchParams {
  return {
    q: encodeState(values),
  };
}
