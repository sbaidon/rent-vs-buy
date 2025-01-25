import { CalculatorValues } from "../context/calculator-context";
import { BuyingCostsCalculator } from "./buy-costs-calculator";
import { RentingCostsCalculator } from "./rent-costs-calculator";

export type CalculatorResults = {
  initialCost: number;
  opportunityCost: number;
  recurringCost: number;
  netProceeds: number;
  totalCost: number;
};

export interface Calculator {
  getTotalCost(values?: CalculatorValues): number;
  calculate(values?: CalculatorValues): CalculatorResults;
}

const determineDirection = (
  values: CalculatorValues,
  parameter: keyof CalculatorValues,
  min: number,
  max: number
): boolean => {
  const buyingCalculator = new BuyingCostsCalculator(values);
  const rentingCalculator = new RentingCostsCalculator(values);

  const startValues = { ...values, [parameter]: min };
  const endValues = { ...values, [parameter]: max };

  const startDifference =
    rentingCalculator.getTotalCost(startValues) -
    buyingCalculator.getTotalCost(startValues);

  const endDifference =
    rentingCalculator.getTotalCost(endValues) -
    buyingCalculator.getTotalCost(endValues);

  return endDifference > startDifference;
};

export function findIntersectionPoint(
  values: CalculatorValues,
  parameter: keyof CalculatorValues,
  min: number,
  max: number,
  segments: number,
  step: number
): number {
  const increasingDifferenceWithValue = determineDirection(
    values,
    parameter,
    min,
    max
  );
  const buyingCalculator = new BuyingCostsCalculator(values);
  const rentingCalculator = new RentingCostsCalculator(values);

  let left = 0;
  let right = segments - 1;
  let difference;
  let closestMid = 0;
  let smallestDifference = Infinity;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const value = min + mid * step;

    const testValues = { ...values, [parameter]: value };

    difference =
      rentingCalculator.getTotalCost(testValues) -
      buyingCalculator.getTotalCost(testValues);

    if (Math.abs(difference) < Math.abs(smallestDifference)) {
      smallestDifference = difference;
      closestMid = mid;
    }

    if (increasingDifferenceWithValue) {
      if (difference < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    } else {
      if (difference < 0) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
  }

  return closestMid;
}
