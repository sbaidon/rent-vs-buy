import { CalculatorValues } from "../context/calculator-context";

export type CalculatorResults = {
  initialCost: number;
  opportunityCost: number;
  recurringCost: number;
  netProceeds: number;
  totalCost: number;
  yearlyBreakdown: number[];
};

export type PriceOutcome =
  | "rent"
  | "buy"
  | "start-rent-end-buy"
  | "start-buy-end-rent";

export interface Calculator {
  getTotalCost(values?: CalculatorValues): number;
  calculate(values?: CalculatorValues): CalculatorResults;
}

/** Any calculator that can compute a total cost for a given set of values. */
export interface CostCalculator {
  getTotalCost(values?: CalculatorValues): number;
}

/**
 * Find the root of f(x) = rentCost(x) - buyCost(x) using bisection.
 *
 * The caller guarantees that f has opposite signs at the endpoints
 * (priceOutcome is a crossover type), so by the intermediate value
 * theorem at least one root exists. Bisection finds the segment index
 * closest to that root in O(log n) evaluations (~17 for 100k segments).
 *
 * Returns the index as a single-element array for consistency with the
 * consumer, which supports multiple crossovers in principle.
 */
export function findIntersectionPoints(options: {
  values: CalculatorValues;
  parameter: keyof CalculatorValues;
  min: number;
  max: number;
  segments: number;
  step: number;
  /** Pre-built buying calculator (country-aware). */
  buyingCalculator: CostCalculator;
  /** Pre-built renting calculator (country-aware). */
  rentingCalculator: CostCalculator;
}): number[] {
  const {
    values, parameter, min, segments, step,
    buyingCalculator, rentingCalculator,
  } = options;

  /** f(idx) = rentCost - buyCost at the given segment index. */
  const f = (idx: number): number => {
    const testValues = { ...values, [parameter]: min + idx * step };
    return (
      rentingCalculator.getTotalCost(testValues) -
      buyingCalculator.getTotalCost(testValues)
    );
  };

  let lo = 0;
  let hi = segments - 1;
  const signAtLo = f(lo) < 0;

  // Track the index closest to zero (smallest |f|) as we bisect.
  let closestIdx = lo;
  let smallestAbs = Infinity;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const fm = f(mid);
    const absFm = Math.abs(fm);

    if (absFm < smallestAbs) {
      smallestAbs = absFm;
      closestIdx = mid;
    }

    if ((fm < 0) === signAtLo) {
      lo = mid + 1; // same sign as start → root is to the right
    } else {
      hi = mid - 1; // opposite sign → root is to the left
    }
  }

  return [closestIdx];
}
