/**
 * Hook for managing saved calculator scenarios with localStorage persistence.
 *
 * Supports up to 3 saved scenarios for side-by-side comparison.
 */

import { useState, useCallback, useEffect } from "react";
import type { CalculatorValues } from "../context/calculator-context";
import type { CostCalculationResult } from "../utils/calculator-factory";

const STORAGE_KEY = "rvb-scenarios";
const MAX_SCENARIOS = 3;

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: number;
  values: CalculatorValues;
  country: string;
  results: {
    buying: CostCalculationResult;
    renting: CostCalculationResult;
  };
}

function loadFromStorage(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(scenarios: SavedScenario[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(loadFromStorage);
  const [showComparison, setShowComparison] = useState(false);

  // Sync to localStorage on change
  useEffect(() => {
    saveToStorage(scenarios);
  }, [scenarios]);

  const saveScenario = useCallback(
    (
      name: string,
      values: CalculatorValues,
      country: string,
      results: { buying: CostCalculationResult; renting: CostCalculationResult }
    ): boolean => {
      if (scenarios.length >= MAX_SCENARIOS) return false;

      const scenario: SavedScenario = {
        id: `s-${Date.now()}`,
        name,
        savedAt: Date.now(),
        values,
        country,
        results,
      };

      setScenarios((prev) => [...prev, scenario]);
      return true;
    },
    [scenarios.length]
  );

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearScenarios = useCallback(() => {
    setScenarios([]);
    setShowComparison(false);
  }, []);

  const openComparison = useCallback(() => setShowComparison(true), []);
  const closeComparison = useCallback(() => setShowComparison(false), []);

  return {
    scenarios,
    showComparison,
    canSave: scenarios.length < MAX_SCENARIOS,
    saveScenario,
    removeScenario,
    clearScenarios,
    openComparison,
    closeComparison,
  };
}
