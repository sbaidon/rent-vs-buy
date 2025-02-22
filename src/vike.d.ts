import type { CalculatorValues } from "./context/calculator-context";

declare global {
  namespace Vike {
    interface PageContext {
      data: {
        initialState?: CalculatorValues;
      };
    }
  }
}

// Tell TypeScript this file isn't an ambient module:
export {};
